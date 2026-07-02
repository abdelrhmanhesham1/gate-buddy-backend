const axios = require("axios");
const { DateTime } = require("luxon");

const weatherCache = new Map();

const getWeatherCondition = (code) => {
  const mapping = { 0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog" };
  return mapping[code] || "Cloudy";
};

const getCoordinates = async (city) => {
  try {
    const { data } = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
      params: { name: city, count: 1 }
    });
    return data.results?.[0]
      ? {
          lat: data.results[0].latitude,
          lng: data.results[0].longitude,
          timezone: data.results[0].timezone
        }
      : null;
  } catch (err) { return null; }
};

exports.getArrivalWeather = async (city, arrivalTime = null) => {
  if (!city) return { temp: "--", condition: "Unknown", timezone: "Africa/Cairo" };
  
  let apiData;
  const cached = weatherCache.get(city);
  if (cached && (Date.now() - cached.timestamp < 1800000)) {
    apiData = cached.data;
  } else {
    const coords = await getCoordinates(city);
    if (!coords) return { temp: "--", condition: "Unavailable", timezone: "Africa/Cairo" };

    try {
      const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
        params: {
          latitude: coords.lat,
          longitude: coords.lng,
          current_weather: true,
          hourly: "temperature_2m,weathercode",
          timezone: "UTC"
        }
      });
      
      apiData = {
        current: {
          temp: `${Math.round(data.current_weather.temperature)}°C`,
          condition: getWeatherCondition(data.current_weather.weathercode)
        },
        hourly: data.hourly,
        timezone: coords.timezone || "Africa/Cairo"
      };
      weatherCache.set(city, { timestamp: Date.now(), data: apiData });
    } catch (err) {
      return { temp: "--", condition: "Unavailable", timezone: "Africa/Cairo" };
    }
  }

  // If arrivalTime is provided, try to find the forecasted weather at arrival
  if (arrivalTime && apiData.hourly && apiData.hourly.time && apiData.hourly.time.length > 0) {
    const targetTimeMs = new Date(arrivalTime).getTime();
    let closestIndex = -1;
    let minDiff = Infinity;
    for (let i = 0; i < apiData.hourly.time.length; i++) {
      const forecastTimeMs = new Date(apiData.hourly.time[i] + "Z").getTime();
      const diff = Math.abs(forecastTimeMs - targetTimeMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    // Check if the closest hourly forecast is within 24 hours of arrival
    if (closestIndex !== -1 && minDiff < 24 * 60 * 60 * 1000) {
      return {
        temp: `${Math.round(apiData.hourly.temperature_2m[closestIndex])}°C`,
        condition: getWeatherCondition(apiData.hourly.weathercode[closestIndex]),
        timezone: apiData.timezone
      };
    }
  }

  // Fallback to current weather
  return {
    ...apiData.current,
    timezone: apiData.timezone
  };
};

exports.getArrivalTimeFormatted = (time, timezone = "Africa/Cairo") => {
  return DateTime.fromJSDate(time).setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE);
};

exports.getCurrentLocalTime = (timezone = "Africa/Cairo") => {
  return DateTime.now().setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE);
};
