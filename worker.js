/**
 * worker.js — 觀卜的進入點程式
 */
import { onRequestPost, onRequestPostChat } from "./functions/ask.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST") {
      if (url.pathname === "/ask") {
        return onRequestPost({ request, env, ctx });
      }
      if (url.pathname === "/chat") {
        return onRequestPostChat({ request, env, ctx });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
