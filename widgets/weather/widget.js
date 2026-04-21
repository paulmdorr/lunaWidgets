const WEATHER_CODES = {
  0: { condition: 'Clear sky', icon: 'wi-day-sunny' },
  1: { condition: 'Mainly clear', icon: 'wi-day-sunny-overcast' },
  2: { condition: 'Partly cloudy', icon: 'wi-day-cloudy' },
  3: { condition: 'Overcast', icon: 'wi-cloudy' },
  45: { condition: 'Fog', icon: 'wi-fog' },
  48: { condition: 'Icy fog', icon: 'wi-fog' },
  51: { condition: 'Light drizzle', icon: 'wi-sprinkle' },
  53: { condition: 'Drizzle', icon: 'wi-sprinkle' },
  55: { condition: 'Heavy drizzle', icon: 'wi-sprinkle' },
  61: { condition: 'Light rain', icon: 'wi-rain' },
  63: { condition: 'Rain', icon: 'wi-rain' },
  65: { condition: 'Heavy rain', icon: 'wi-rain' },
  71: { condition: 'Light snow', icon: 'wi-snow' },
  73: { condition: 'Snow', icon: 'wi-snow' },
  75: { condition: 'Heavy snow', icon: 'wi-snow' },
  80: { condition: 'Light showers', icon: 'wi-showers' },
  81: { condition: 'Showers', icon: 'wi-showers' },
  82: { condition: 'Heavy showers', icon: 'wi-showers' },
  95: { condition: 'Thunderstorm', icon: 'wi-thunderstorm' },
  96: { condition: 'Thunderstorm with hail', icon: 'wi-thunderstorm' },
  99: { condition: 'Thunderstorm with hail', icon: 'wi-thunderstorm' },
};
const REFRESH_RATE = 5 * 60 * 1000;

const { latitude, longitude, units = 'celsius', city } = widget.config;
const tempUnit = units === 'fahrenheit' ? '°F' : '°C';
const temperatureUnit = units === 'fahrenheit' ? 'fahrenheit' : 'celsius';

let isFirstLoad = true;

widget.onRefresh(async () => {
  if (isFirstLoad) widget.setLoading(true);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=${temperatureUnit}&wind_speed_unit=kmh`;
    const res = await widget.fetch(url);

    if (!res.ok) return;

    const data = await res.json();
    const weather = WEATHER_CODES[data.current.weather_code] ?? {
      condition: 'Unknown',
      icon: 'wi-na',
    };

    widget.store = {
      temperature: Math.round(data.current.temperature_2m),
      tempUnit,
      condition: weather.condition,
      icon: weather.icon,
      city,
    };
  } catch {
    widget.setError('Failed to load weather');
  } finally {
    if (isFirstLoad) {
      isFirstLoad = false;
      widget.setLoading(false);
    }
  }
}, REFRESH_RATE);
