// 產生 public/ziwei-pattern-terms.js：把格局判定（src/patterns.ts）會輸出的簡體字句，事先用 OpenCC（簡→台灣正體）轉好。
// 執行時只做查表替換，不用把整套 OpenCC 字典（約 1 MB）放進網頁。執行：npm run build:ziwei-terms
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as OpenCC from 'opencc-js';

const root = path.dirname(fileURLToPath(import.meta.url));
const opencc = OpenCC.Converter({ from: 'cn', to: 'tw' });

// 紫微的用字修正：OpenCC 會把地支「丑」轉成「醜」、天干的「干」轉成「乾／幹」、副詞「只」轉成「隻」。
// 丑、只一律保留；干在天干語境（前一字 天年月日時宮陰陽換，或後一字 支對換化）保留，其他（例如 骨干→骨幹）照 OpenCC。
const KEEP_ALWAYS = new Set(['丑', '只']);
const keepGan = (text, i) => (i > 0 && '天年月日时宫阴阳换'.includes(text[i - 1])) || (i + 1 < text.length && '支对换化'.includes(text[i + 1]));
export function convert(text) {
  const tw = opencc(text);
  // 長度不同時無法逐字對齊：醜 在紫微裡一定是地支 丑，可以直接改；含 只／干 的就停下來請人處理，不要默默轉錯
  if (tw.length !== text.length) {
    if (/[只干]/.test(text)) throw new Error(`cannot align conversion for: ${text}`);
    return tw.replace(/醜/g, '丑');
  }
  return [...tw].map((c, i) => (KEEP_ALWAYS.has(text[i]) || (text[i] === '干' && keepGan(text, i))) ? text[i] : c).join('');
}

function main() {
  // 格局文字由 patterns.ts 的字串加上星名、宮名組成（星名、宮名在 constants.ts）
  const files = ['src/patterns.ts', 'src/constants.ts'];
  const PUNCT = '《》·（）、，。：；！？“”‘’「」—…\u3000';
  const CJK_RUN = new RegExp(`[\\u3400-\\u9fff${PUNCT}]+`, 'g');
  const TRIM = new RegExp(`^[${PUNCT}]+|[${PUNCT}]+$`, 'g');
  const runs = new Set();
  for (const f of files) {
    const text = readFileSync(path.join(root, f), 'utf8');
    for (const m of text.matchAll(CJK_RUN)) {
      const run = m[0].replace(TRIM, '');
      if (run) runs.add(run);
    }
  }
  // 全部從「整句在上下文裡的轉換結果」推出來（OpenCC 單獨轉一個字和放在句子裡不一定一樣，例如 斗、云）
  const dict = {};
  const targets = new Map();
  const aligned = [];
  for (const run of runs) {
    const tw = convert(run);
    if (tw !== run) dict[run] = tw;
    if (tw.length !== run.length) continue;
    aligned.push([run, tw]);
    for (let i = 0; i < run.length; i++) {
      if (!targets.has(run[i])) targets.set(run[i], new Set());
      targets.get(run[i]).add(tw[i]);
    }
  }
  // 只有一種轉法的字：逐字轉
  const chars = {};
  for (const [c, set] of targets) if (set.size === 1 && !set.has(c)) chars[c] = [...set][0];
  // 有多種轉法的字（例如 系→系／係）：收它前後的短詞，詞在所有句子裡轉法一致才收
  const windows = new Map();
  for (const [run, tw] of aligned) for (let i = 0; i < run.length; i++) {
    if (targets.get(run[i]).size < 2) continue;
    for (const [a, b] of [[i - 1, i + 1], [i, i + 2], [i - 1, i + 2], [i - 2, i + 1], [i, i + 3]]) {
      if (a < 0 || b > run.length) continue;
      const sub = run.slice(a, b);
      if (!windows.has(sub)) windows.set(sub, new Set());
      windows.get(sub).add(tw.slice(a, b));
    }
  }
  for (const [sub, set] of windows) if (set.size === 1) { const tw = [...set][0]; if (tw !== sub) dict[sub] = tw; }

  const sorted = obj => JSON.stringify(Object.fromEntries(Object.entries(obj).sort()));
  // 用 var：重新載入同一個 script 時不會因為重複宣告而出錯
  const out = `// 由 ziwei-engine/build-pattern-terms.mjs 產生，請勿手改。格局條件、破格警示與出處的簡體→正體對照（OpenCC cn→tw，加紫微用字修正）。
var ZW_PATTERN_S2T = ${sorted(dict)};
var ZW_PATTERN_CHARS = ${sorted(chars)};
var ZW_PATTERN_RE = Object.keys(ZW_PATTERN_S2T).length === 0 ? /(?!)/g : new RegExp(Object.keys(ZW_PATTERN_S2T).sort(function (a, b) { return b.length - a.length; }).map(function (k) { return k.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); }).join('|'), 'g');
// 字句先整段替換（長的先比對），其餘只轉沒有歧義的字；沒有收錄的字維持原樣
function zwPatternText(s) {
  return String(s || '').replace(ZW_PATTERN_RE, function (m) { return ZW_PATTERN_S2T[m]; }).replace(/[\\u3400-\\u9fff]/g, function (c) { return ZW_PATTERN_CHARS[c] || c; });
}
`;
  writeFileSync(path.join(root, '..', 'public', 'ziwei-pattern-terms.js'), out);
  console.log(`ziwei-pattern-terms.js: ${Object.keys(dict).length} phrases, ${Object.keys(chars).length} single characters, from ${runs.size} runs`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
