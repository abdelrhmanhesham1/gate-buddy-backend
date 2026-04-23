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
    return data.results?.[0] ? { lat: data.results[0].latitude, lng: data.results[0].longitude } : null;
  } catch (err) { return null; }
};

exports.getArrivalWeather = async (city) => {
  if (!city) return { temp: "--", condition: "Unknown" };
  const cached = weatherCache.get(city);
  if (cached && (Date.now() - cached.timestamp < 1800000)) return cached.data;

  const coords = await getCoordinates(city);
  if (!coords) return { temp: "--", condition: "Unavailable" };

  try {
    const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: { latitude: coords.lat, longitude: coords.lng, current_weather: true }
    });
    const result = { temp: `${Math.round(data.current_weather.temperature)}°C`, condition: getWeatherCondition(data.current_weather.weathercode) };
    weatherCache.set(city, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) { return { temp: "--", condition: "Unavailable" }; }
};

exports.getArrivalTimeFormatted = (time, timezone = "Africa/Cairo") => {
  return DateTime.fromJSDate(time).setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE);
};
