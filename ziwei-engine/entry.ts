// Browser entry for the Zi Wei engine (src/ is vendored from Renhuai123/ziwei-doushu, MIT).
import { generateChart } from './src/algorithm';
import { detectPatterns } from './src/patterns';
import type { ZiweiChart } from './src/types';

export interface ClockBirth {
  date: string;   // YYYY-MM-DD (Gregorian)
  time: string;   // HH:MM (local clock)
  gender: 'M' | 'F';
}

export interface GuanbuZiweiResult {
  chart: ZiweiChart;
  patterns: { name: string; level: string; palaces: string[] }[];
  /** Gregorian date actually used for the chart (23:00–23:59 counts as the next day's 子時). */
  chartDate: string;
}

function shiftDay(y: number, m: number, d: number, days: number): [number, number, number] {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

export function buildChart(input: ClockBirth): GuanbuZiweiResult {
  let [year, month, day] = input.date.split('-').map(Number);
  const [clockHour, clockMinute] = input.time.split(':').map(Number);
  // Upstream default rule: 23:00–23:59 is charted as 子時 of the following day.
  if (clockHour === 23) [year, month, day] = shiftDay(year, month, day, 1);
  const hour = clockHour === 23 ? 0 : Math.floor((clockHour + 1) / 2);
  const chart = generateChart({
    year, month, day, hour,
    gender: input.gender === 'F' ? 'female' : 'male',
    origInput: { year: Number(input.date.slice(0, 4)), month: Number(input.date.slice(5, 7)), day: Number(input.date.slice(8, 10)), clockHour, clockMinute: clockMinute || 0 },
  });
  const patterns = detectPatterns(chart).map(p => ({ name: p.name, level: p.level, palaces: p.palaces }));
  const pad = (n: number) => String(n).padStart(2, '0');
  return { chart, patterns, chartDate: `${year}-${pad(month)}-${pad(day)}` };
}
