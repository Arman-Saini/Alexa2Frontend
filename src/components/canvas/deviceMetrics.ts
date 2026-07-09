import type { AlexaDeviceState } from '../../types';

export interface DeviceMetric {
  key: string;
  icon: string;
  label: string;
  value: string;
}

// Shared field->row mapping consumed by both DevicePanel (full detail) and
// SensorTooltip (hover preview) so the two popovers can't drift out of sync
// on what a given AlexaDeviceState field means.
export function deviceMetrics(ds: AlexaDeviceState): DeviceMetric[] {
  const rows: DeviceMetric[] = [];
  if (ds.temperature !== undefined) rows.push({ key: 'temp', icon: '🌡️', label: 'Temperature', value: `${ds.temperature.toFixed(1)}°C` });
  if (ds.humidity !== undefined) rows.push({ key: 'hum', icon: '💧', label: 'Humidity', value: `${ds.humidity.toFixed(0)}%` });
  if (ds.brightness !== undefined) rows.push({ key: 'bright', icon: '💡', label: 'Brightness', value: `${ds.brightness}%` });
  if (ds.colorTemp !== undefined) rows.push({ key: 'ctemp', icon: '🎨', label: 'Color Temp', value: `${ds.colorTemp}K` });
  if (ds.volume !== undefined) rows.push({ key: 'vol', icon: '🔊', label: 'Volume', value: `${ds.volume}%` });
  if (ds.speed !== undefined) rows.push({ key: 'speed', icon: '💨', label: 'Fan Speed', value: `${ds.speed}/5` });
  if (ds.airQuality !== undefined) rows.push({ key: 'aqi', icon: '🌬️', label: 'Air Quality', value: `AQI ${ds.airQuality.toFixed(0)}` });
  if (ds.batteryLevel !== undefined) rows.push({ key: 'batt', icon: '🔋', label: 'Battery', value: `${ds.batteryLevel.toFixed(0)}%` });
  if (ds.motionDetected !== undefined) rows.push({ key: 'motion', icon: '👁️', label: 'Motion', value: ds.motionDetected ? 'Detected' : 'Clear' });
  if (ds.isLocked !== undefined) rows.push({ key: 'lock', icon: ds.isLocked ? '🔒' : '🔓', label: 'Lock', value: ds.isLocked ? 'Locked' : 'Unlocked' });
  if (ds.channel !== undefined) rows.push({ key: 'ch', icon: '📺', label: 'Channel', value: `CH ${ds.channel}` });
  if (ds.powerConsumption !== undefined) rows.push({ key: 'pw', icon: '⚡', label: 'Power Draw', value: ds.isOn ? `${ds.powerConsumption.toFixed(1)}W` : '0W' });
  if (ds.timerMinutes !== undefined) rows.push({ key: 'timer', icon: '⏱️', label: 'Timer', value: `${ds.timerMinutes} min` });
  if (ds.waterLevel !== undefined) rows.push({ key: 'water', icon: '🚰', label: 'Water Level', value: `${ds.waterLevel}%` });
  if (ds.whistleCount !== undefined) rows.push({ key: 'whistle', icon: '🍲', label: 'Whistles', value: `${ds.whistleCount}` });
  if (ds.pressure !== undefined) rows.push({ key: 'pressure', icon: '📈', label: 'Pressure', value: `${ds.pressure}` });
  return rows;
}
