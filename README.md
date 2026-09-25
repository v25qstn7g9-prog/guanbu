# 觀卜 Guanbu v2.5.0

觀卜是以易經、塔羅、盧恩、紫微與每日指引為核心的靜態前端 + Cloudflare Worker App。

## 目前版本

- App：`2.5.0`
- AI API：`guanbu-ask-2.7`
- Primary AI：`@cf/openai/gpt-oss-120b`
- Gemini fallback：`gemini-3.5-flash`
- 最後版本同步：2026-09-25

## Runtime

`worker.js` 提供 `POST /ask` 與 `POST /chat`，其餘請求交由 Cloudflare Static Assets。

目前 AI 路由為 Cloudflare Workers AI 主線；主線逾時或失敗時自動切換 Gemini 3.5 Flash 備援。占卜計算與 UI 行為不受此路由調整影響。
