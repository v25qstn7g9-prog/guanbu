// Browser entry for the Zi Wei engine (src/ is vendored from Renhuai123/ziwei-doushu, MIT).
import { generateChart } from './src/algorithm';
import { detectPatterns } from './src/patterns';
import type { ZiweiChart } from './src/types';

export interface ClockBirth {
  date: string;   // YYYY-MM-DD (Gregorian)
  time: string;   // HH:MM (local clock)
  gender: 'M' | 'F';
}

export interface GuanbuZiweiPattern {
  name: string;
  level: string;
  palaces: string[];
  description: string;
  /** 上游 patterns.ts 判定的條件：成立（required）、加分（bonus）、破格警示（breaking） */
  required: string[];
  bonus: string[];
  breaking: string[];
  /** 上游標註的古籍出處 */
  source: string;
}

export interface GuanbuZiweiResult {
  chart: ZiweiChart;
  patterns: GuanbuZiweiPattern[];
  /** Gregorian date actually used for the chart (23:00–23:59 counts as the next day's 子時). */
  chartDate: string;
}

function shiftDay(y: number, m: number, d: number, days: number): [number, number, number] {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

// 輸入要先驗證：不存在的日期（例如 2023-02-29）不能被 23 點換日「順便」改成另一天
export function validateBirth(input: ClockBirth): void {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input?.date ?? ''));
  if (!d) throw new Error('invalid date: expected YYYY-MM-DD');
  const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  // 只排 1900–2100 年（曆法資料與換日、真太陽時計算都以這段為準）
  if (y < 1900 || y > 2100) throw new Error('invalid date: year must be 1900-2100');
  const real = new Date(Date.UTC(y, m - 1, day));
  if (real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== day) throw new Error('invalid date: day does not exist');
  const t = /^(\d{2}):(\d{2})$/.exec(String(input?.time ?? ''));
  if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) throw new Error('invalid time: expected HH:MM');
  if (input.gender !== 'M' && input.gender !== 'F') throw new Error('invalid gender: expected M or F');
}

export function buildChart(input: ClockBirth): GuanbuZiweiResult {
  validateBirth(input);
  let [year, month, day] = input.date.split('-').map(Number);
  const [clockHour, clockMinute] = input.time.split(':').map(Number);
  // Upstream default rule: 23:00–23:59 is charted as 子時 of the following day.
  if (clockHour === 23) [year, month, day] = shiftDay(year, month, day, 1);
  const hour = clockHour === 23 ? 0 : Math.floor((clockHour + 1) / 2);
  const chart = generateChart({
    year, month, day, hour,
    gender: input.gender === 'F' ? 'female' : 'male',
    origInput: { year: Number(input.date.slice(0, 4)), month: Number(input.date.slice(5, 7)), day: Number(input.date.slice(8, 10)), clockHour, clockMinute },
  });
  // 保留上游已算出的成立條件、破格警示與出處，不只留名稱
  const patterns = detectPatterns(chart).map(p => ({
    name: p.name, level: p.level, palaces: p.palaces, description: p.description,
    required: p.conditions?.required ?? [], bonus: p.conditions?.bonus ?? [], breaking: p.conditions?.breaking ?? [],
    source: p.source ?? '',
  }));
  const pad = (n: number) => String(n).padStart(2, '0');
  return { chart, patterns, chartDate: `${year}-${pad(month)}-${pad(day)}` };
}
