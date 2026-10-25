# 觀卜 Guanbu v2.5.0

觀卜是以易經、塔羅、盧恩、紫微與每日指引為核心的靜態前端 + Cloudflare Worker App。

## 目前版本

- App：`2.5.0`
- AI API：`guanbu-ask-3.4`
- Primary AI：`@cf/deepseek-ai/deepseek-v4-flash-0731`（平衡型，reasoning_effort: low；需 Workers Paid 方案）
- Gemini fallback：`gemini-3.6-flash`
- 最後版本同步：2026-10-25

## Runtime

`worker.js` 提供 `POST /ask` 與 `POST /chat`，其餘請求交由 Cloudflare Static Assets。

目前 AI 路由為 Cloudflare Workers AI 主線；主線逾時或失敗時自動切換 Gemini 3.6 Flash 備援。主、副都採各家的平衡型（Flash）模型。占卜計算與 UI 行為不受此路由調整影響。

## 紫微排盤引擎

紫微頁的排盤來自 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) 的 `lib/ziwei`（MIT，原始檔與授權在 `ziwei-engine/`），以 [iztro](https://github.com/SylarLong/iztro) 與 [lunar-javascript](https://github.com/6tail/lunar-javascript) 為核心。打包好的 `public/ziwei-engine.js` 在第一次打開紫微時才載入；引擎輸出的簡體星名由 `public/ziwei-terms.js` 轉成正體並提供英文／印尼文。

引擎原始檔取自上游 `1059c347231c636bd86ddb78fd8ed430d5de8d2a`（2026-10-20）。格局（`src/patterns.ts`）的成立條件、加分、破格警示與出處會一起顯示在「格局依據」並送給 AI；這些是上游程式的規則判定與它標註的出處，未逐條核對原典。條件文字是簡體，由 `public/ziwei-pattern-terms.js` 轉成正體（建置時用 OpenCC 產生的小對照表，網頁不載入整套 OpenCC）；英文／印尼文介面只顯示格局名稱與等級。

易經「卦象詳解」的卦辭節錄與「第三方天紀摘要」取自同一上游的 `lib/nihai/tianji.ts`（同一版本），是簡短整理，不是原典全文或完整的倪師學說，也沒有逐爻爻辭。

改了 `ziwei-engine/` 之後重新打包（格局文字有變也要重產對照表）：

```sh
npm ci
npm run build:ziwei
npm run build:ziwei-terms
```

## 本機回歸測試

需要 Node.js 20 以上。先安裝鎖定的測試套件與 Chromium：

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

測試會在 `127.0.0.1` 的系統分配空閒連接埠自行啟動及關閉靜態伺服器，避免與開發伺服器衝突。若系統已有 `/usr/bin/chromium`，會優先使用；其他系統則使用 Playwright 安裝的瀏覽器，也可透過 `CHROMIUM_PATH` 指定執行檔。

測試涵蓋手機命盤完整顯示、三語既有結果切換、44px 互動與16px輸入、清除追問的延遲回應、未來出生日期及長牌名。所有 AI 回應由本機攔截，不需 API 金鑰，也不會呼叫付費 AI。
