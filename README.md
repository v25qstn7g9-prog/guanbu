# 觀卜 Guanbu v2.5.0

觀卜是以易經、塔羅、盧恩、紫微與每日指引為核心的靜態前端 + Cloudflare Worker App。

## 目前版本

- App：`2.5.0`
- AI API：`guanbu-ask-2.5`
- Primary AI：`@cf/openai/gpt-oss-120b`
- Gemini fallback：`gemini-3.5-flash-lite`
- 最後版本同步：2026-09-20

## Runtime

`worker.js` 提供 `POST /ask` 與 `POST /chat`，其餘請求交由 Cloudflare Static Assets。

本次 v2.5.0 僅建立正式版本管理基準，不改占卜計算、AI 提示詞或 UI 功能。
