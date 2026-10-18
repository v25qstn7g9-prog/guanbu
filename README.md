# 觀卜 Guanbu v2.5.0

觀卜是以易經、塔羅、盧恩、紫微與每日指引為核心的靜態前端 + Cloudflare Worker App。

## 目前版本

- App：`2.5.0`
- AI API：`guanbu-ask-2.7`
- Primary AI：`@cf/openai/gpt-oss-120b`
- Gemini fallback：`gemini-3.6-flash`
- 最後版本同步：2026-09-25

## Runtime

`worker.js` 提供 `POST /ask` 與 `POST /chat`，其餘請求交由 Cloudflare Static Assets。

目前 AI 路由為 Cloudflare Workers AI 主線；主線逾時或失敗時自動切換 Gemini 3.5 Flash 備援。占卜計算與 UI 行為不受此路由調整影響。

## 本機回歸測試

需要 Node.js 20 以上。先安裝鎖定的測試套件與 Chromium：

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

測試會在 `127.0.0.1` 的系統分配空閒連接埠自行啟動及關閉靜態伺服器，避免與開發伺服器衝突。若系統已有 `/usr/bin/chromium`，會優先使用；其他系統則使用 Playwright 安裝的瀏覽器，也可透過 `CHROMIUM_PATH` 指定執行檔。

測試涵蓋手機命盤完整顯示、三語既有結果切換、44px 互動與16px輸入、清除追問的延遲回應、未來出生日期及長牌名。所有 AI 回應由本機攔截，不需 API 金鑰，也不會呼叫付費 AI。
