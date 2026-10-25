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

## 易經書面來源：第一批有限校讀

`public/yijing-evidence.js` 只收復24、大畜26、恆32、大壯34、家人37、蹇39、解40、益42的短主題與 PDF 頁碼。來源是 [doc836579418《天紀—易經》](https://www.scribd.com/document/836579418/%E5%A4%A9%E7%BA%AA-%E6%98%93%E7%BB%8F)，206頁第三方課程轉寫，**不是核實官方定本，也不是預測實證**。主題是有限原創概括；適用條件及安全邊界明標為編輯設計，不是來源原話或公式。

命中8卦時，畫面與首問／追問改用卦理主題，不再混送舊白話卦意、天紀摘要或占斷；其餘56卦明標未核。保留卦名、卦序、動爻位置與起卦方法，不改起卦／排盤算法。只用一般卦理，不混圖占、陽宅、四柱或人紀醫學；沒有已核動爻取用規則，不作逐爻推演。之卦不是確定未來。這不代表天紀／人紀全套整合完成。

facts 優先保留計算資料及完整主題／限制，超額時只省略完整的可選舊摘要欄位，透過 `InterpretationFieldsOmitted` 計數，絕不截斷否定或條件。來源模組載入失敗時停止解讀請求。測試僅用合成輸入及攔截的 AI 回應，驗證資料與提示傳遞，不冒稱實際模型效果評測；PR CI 不讀 secrets、不呼叫付費模型。
