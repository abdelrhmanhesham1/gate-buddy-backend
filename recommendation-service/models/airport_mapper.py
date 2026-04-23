"""
Airport Code to City Mapper

Maps ICAO and IATA airport codes to city names and countries.
This is essential for the live scraper since we no longer have a database.
"""

import json
from pathlib import Path
from typing import Optional, Dict
import aiohttp


class AirportMapper:
    """Maps airport codes to city information"""
    
    def __init__(self, data_file: str = None):
        """
        Initialize the airport mapper
        
        Args:
            data_file: Path to airport codes JSON file (optional)
        """
        if data_file is None:
            data_file = Path(__file__).parent.parent / "data" / "airport_codes.json"
        
        self.data_file = Path(data_file)
        self.airport_data = self._load_airport_data()
        self.session = None
    
    def _load_airport_data(self) -> Dict:
        """Load airport codes from JSON file"""
        try:
            if self.data_file.exists():
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Return empty dict if file doesn't exist yet
                return {}
        except Exception as e:
            print(f"Warning: Could not load airport data: {e}")
            return {}
    
    def get_city_from_code(self, airport_code: str) -> Optional[Dict[str, str]]:
        """
        Get city information from airport code (ICAO or IATA)
        
        Args:
            airport_code: ICAO (4-letter) or IATA (3-letter) code
            
        Returns:
            Dictionary with city, country, and alternate codes, or None
        """
        code = airport_code.upper().strip()
        
        # Direct lookup
        if code in self.airport_data:
            return self.airport_data[code]
        
        # Try to find by alternate code
        for stored_code, info in self.airport_data.items():
            if info.get('iata') == code or info.get('icao') == code:
                return info
        
        return None
    
    async def get_city_from_code_online(self, airport_code: str) -> Optional[Dict[str, str]]:
        """
        Fallback: Fetch airport info from online API if not in local database
        Uses Aviation Edge API (or similar free API)
        
        Args:
            airport_code: ICAO or IATA code
            
        Returns:
            Dictionary with city and country, or None
        """
        try:
            # Try Airport Codes API (free tier)
            if self.session is None or self.session.closed:
                self.session = aiohttp.ClientSession()
            
            # Use a free airport database API
            url = f"https://airports-api.s-hw.com/airports/{airport_code.upper()}"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    city_name = data.get('city', '')
                    country_name = data.get('country', '')
                    
                    if city_name and country_name:
                        return {
                            'city': city_name,
                            'country': country_name,
                            'iata': data.get('iata', ''),
                            'icao': data.get('icao', '')
                        }
            
            return None
            
        except Exception as e:
            print(f"Error fetching airport info online: {e}")
            return None
    
    async def get_city_info(self, airport_code: str) -> Optional[Dict[str, str]]:
        """
        Get city info, trying local database first, then online API
        
        Args:
            airport_code: ICAO or IATA code
            
        Returns:
            Dictionary with city and country information
        """
        # Try local database first
        info = self.get_city_from_code(airport_code)
        if info:
            return info
        
        # Fallback to online API
        info = await self.get_city_from_code_online(airport_code)
        
        # Cache the result for future use
        if info:
            self.airport_data[airport_code.upper()] = info
            self._save_airport_data()
        
        return info
    
    def _save_airport_data(self):
        """Save airport data back to JSON file"""
        try:
            self.data_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.airport_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Could not save airport data: {e}")
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
