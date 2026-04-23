"""
Production-ready utilities for scraping system:
- Rate limiting
- Circuit breaker
- Retry with exponential backoff
- Disk caching
"""

import asyncio
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from collections import deque
from typing import Optional, Dict, Any, Callable
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for API requests"""
    
    def __init__(self, max_requests: int = 50, time_window: int = 60):
        """
        Args:
            max_requests: Maximum requests allowed in time window
            time_window: Time window in seconds
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        """Wait if necessary to respect rate limit"""
        async with self.lock:
            now = datetime.now()
            cutoff = now - timedelta(seconds=self.time_window)
            
            # Remove old requests outside time window
            while self.requests and self.requests[0] < cutoff:
                self.requests.popleft()
            
            # Check if we're at limit
            if len(self.requests) >= self.max_requests:
                # Calculate wait time
                oldest = self.requests[0]
                wait_seconds = (oldest + timedelta(seconds=self.time_window) - now).total_seconds()
                
                logger.warning(f"Rate limit reached. Waiting {wait_seconds:.1f}s")
                await asyncio.sleep(wait_seconds + 0.1)  # Add small buffer
            
            # Record this request
            self.requests.append(datetime.now())


class CircuitBreaker:
    """Circuit breaker pattern to prevent cascading failures"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 300):
        """
        Args:
            failure_threshold: Number of failures before opening circuit
            timeout: Seconds to wait before trying again (OPEN state)
        """
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
        self.lock = asyncio.Lock()
    
    async def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        async with self.lock:
            # If circuit is OPEN, check if we should try again
            if self.state == 'OPEN':
                time_since_failure = (datetime.now() - self.last_failure_time).total_seconds()
                
                if time_since_failure > self.timeout:
                    self.state = 'HALF_OPEN'
                    logger.info("Circuit breaker entering HALF_OPEN state")
                else:
                    raise CircuitOpenError(
                        f"Service temporarily unavailable. Retry in {self.timeout - time_since_failure:.0f}s"
                    )
        
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure()
            raise
    
    async def _on_success(self):
        """Reset circuit on successful call"""
        async with self.lock:
            self.failure_count = 0
            if self.state == 'HALF_OPEN':
                self.state = 'CLOSED'
                logger.info("Circuit breaker CLOSED - service recovered")
    
    async def _on_failure(self):
        """Increment failure count and potentially open circuit"""
        async with self.lock:
            self.failure_count += 1
            
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
                self.last_failure_time = datetime.now()
                logger.error(
                    f"Circuit breaker OPENED - {self.failure_count} failures. "
                    f"Retry in {self.timeout}s"
                )


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass


class DiskCache:
    """Persistent JSON-based cache that survives restarts"""
    
    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_cache_path(self, key: str) -> Path:
        """Get cache file path for a key"""
        # Use hash to avoid filesystem issues with special characters
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.json"
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached data"""
        try:
            cache_file = self._get_cache_path(key)
            
            if not cache_file.exists():
                return None
            
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            
            # Check expiration
            expires_at = datetime.fromisoformat(cached['expires_at'])
            if datetime.utcnow() >= expires_at:
                logger.info(f"Disk cache expired for {key}")
                return None
            
            logger.info(f"Disk cache hit for {key}")
            return cached['data']
            
        except Exception as e:
            logger.error(f"Error reading disk cache for {key}: {e}")
            return None
    
    async def set(self, key: str, data: Dict[str, Any], ttl_hours: int = 24):
        """Store data in cache"""
        try:
            cache_file = self._get_cache_path(key)
            
            cached = {
                'data': data,
                'cached_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(hours=ttl_hours)).isoformat(),
                'key': key  # Store original key for debugging
            }
            
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cached, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Stored in disk cache: {key} (TTL: {ttl_hours}h)")
            
        except Exception as e:
            logger.error(f"Error writing disk cache for {key}: {e}")
    
    async def get_stale(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached data even if expired (fallback)"""
        try:
            cache_file = self._get_cache_path(key)
            
            if not cache_file.exists():
                return None
            
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            
            logger.warning(f"Using STALE cache for {key}")
            return cached['data']
            
        except Exception as e:
            logger.error(f"Error reading stale cache for {key}: {e}")
            return None
    
    async def delete(self, key: str):
        """Delete cached data"""
        try:
            cache_file = self._get_cache_path(key)
            if cache_file.exists():
                cache_file.unlink()
                logger.info(f"Deleted cache for {key}")
        except Exception as e:
            logger.error(f"Error deleting cache for {key}: {e}")
    
    async def clear_all(self):
        """Clear all cached data"""
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
            logger.info("Cleared all disk cache")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")


async def retry_with_backoff(
    func: Callable,
    *args,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    **kwargs
):
    """
    Retry a function with exponential backoff
    
    Args:
        func: Async function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        backoff_factor: Multiply delay by this factor each retry
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            
            if attempt == max_retries:
                logger.error(f"All {max_retries} retries failed: {e}")
                break
            
            delay = initial_delay * (backoff_factor ** attempt)
            logger.warning(
                f"Attempt {attempt + 1}/{max_retries} failed: {e}. "
                f"Retrying in {delay:.1f}s..."
            )
            await asyncio.sleep(delay)
    
    raise last_exception
