/**
 * worker.js — 觀卜的進入點程式
 *
 * 這支程式決定每個進來的網址要怎麼處理：
 * - /ask（POST）→ 交給 functions/ask.js 裡的 AI 白話說明邏輯
 * - 其他所有網址 → 當一般靜態檔案送出去（index.html 等）
 *
 * 這是「Workers with Static Assets」架構必須有的進入點，
 * 跟 Pages Functions（存股 App 用的那種，functions 資料夾會被自動偵測）不一樣。
 */
import { onRequestPost } from "./functions/ask.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/ask" && request.method === "POST") {
      return onRequestPost({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },
};
