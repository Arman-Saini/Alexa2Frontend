export interface WeatherInfo {
  temp_c: number;
  desc: string;
  humidity: number;
  city: string;
}

export async function fetchWeather(): Promise<WeatherInfo | null> {
  try {
    const res = await fetch('https://wttr.in/?format=j1', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json() as {
      current_condition: Array<{ temp_C: string; weatherDesc: Array<{ value: string }>; humidity: string }>;
      nearest_area: Array<{ areaName: Array<{ value: string }> }>;
    };
    return {
      temp_c:   +data.current_condition[0].temp_C,
      desc:     data.current_condition[0].weatherDesc[0].value,
      humidity: +data.current_condition[0].humidity,
      city:     data.nearest_area[0].areaName[0].value,
    };
  } catch {
    return null;
  }
}
