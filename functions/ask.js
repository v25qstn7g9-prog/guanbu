/**
 * functions/ask.js — 觀卜 AI 白話說明與對話 API（含 Gemini 3.5 Flash-Lite 自動備援）
 *
 * POST /ask  : Body { module, question, facts } -> 白話解讀
 * POST /chat : Body { module, question, facts, history, message } -> 追問對話
 */
const ASK_VERSION = "guanbu-ask-2.1-fallback";
const PRIMARY_MODEL = "@cf/openai/gpt-oss-120b";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const MAX_QUESTION_LEN = 200;
const MAX_FACTS_LEN = 2500;
const MAX_TOKENS = 600;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}

const SYSTEM_PROMPT = `你是「觀卜」App 的占卜陪伴者與說明助手。你的任務是將系統提供的計算結果，轉化為溫暖、靈活、接地氣且充實的白話解析。

【核心原則】
1. 嚴格基於事實：只能基於「事實資料」進行延伸解析，絕不能自行編造未出現的牌名、卦名或星曜。事實資料是唯一真相。
2. 情緒共鳴與同理：若使用者帶著焦慮、迷惘或期待發問，請先給予一句溫暖的理解或安撫，讓對方感受被聽見。
3. 白話且富有靈活性：
   - 避免生硬的命理術語（如「化氣」、「廟旺陷」、「爻位」）。
   - 說話要像一位真誠、貼心的朋友在聊天，多用「其實這代表…」、「換個角度想…」、「這時候你可以…」。
   - 避免像罐頭回答或過於僵硬的警語格式。
4. 結合問題給予動態建議：根據問題領域（如感情、職場、財務、焦慮感），給予具體且溫和的行動心態調整。
5. 長度與排版：字數控制在 160 ~ 260 字左右，分 2-3 個短段落，確保手機螢幕閱讀體驗舒適。`;

const CHAT_SYSTEM_PROMPT = `你是「觀卜」App 的靈活諮詢助手。使用者剛完成一次占卜，正在針對該次結果向你追問細節。

【對話原則】
1. 緊扣占卜事實：回答必須嚴格圍繞著剛才算出的「事實資料」（牌義、卦象、星曜、意圖），不得給出矛盾的推測。
2. 溫和且具建設性：用溫暖、理性且接地氣的口吻解答，引導使用者聚焦在「自己能控制的行動」上，減少無謂的焦慮。
3. 精煉流暢：每次回覆控制在 100 ~ 180 字之間，適合簡訊般輕鬆閱讀。
4. 安全界線：絕不提供醫療診斷、法律判決或具體投資個股建議。`;

function buildUserPrompt(mod, question, factsText) {
  const qLine = question ? `使用者目前的心情或問題是：「${question}」\n\n` : "使用者未輸入特定問題，進行整體指引解析。\n\n";
  const modLabel = { yijing: "易經占卜", tarot: "塔羅牌", runes: "盧恩符文", ziwei: "紫微斗數命盤", daily: "今日運勢" }[mod] || "占卜";
  return `【占卜類型】：${modLabel}\n${qLine}【系統事實資料】：\n${factsText}\n\n請以溫暖、靈活且富有同理心的口吻，為使用者提供深入淺出的白話解讀與心態建議。`;
}

/**
 * 備援 AI：呼叫 Google Gemini 3.5 Flash-Lite API
 */
async function callGeminiFallback(env, systemPrompt, messagesArray) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("備援機制啟動失敗：未設定 GEMINI_API_KEY");
  }

  // 將通用 messages 結構轉為 Gemini generateContent 格式
  const contents = messagesArray.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents,
      generationConfig: {
        maxOutputTokens: MAX_TOKENS,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini API 回傳錯誤 (${response.status})`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini API 未能回傳有效文字");
  }
  return text;
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => null);
    const mod = String(body?.module || "").trim();
    const allowedModules = new Set(["yijing", "tarot", "runes", "ziwei", "daily"]);
    if (!allowedModules.has(mod)) {
      return jsonResponse({ error: "module 參數不正確", version: ASK_VERSION }, 400);
    }

    const question = String(body?.question || "").slice(0, MAX_QUESTION_LEN).trim();
    const facts = body?.facts;
    if (!facts || typeof facts !== "object") {
      return jsonResponse({ error: "缺少 facts 事實資料", version: ASK_VERSION }, 400);
    }

    const factsText = JSON.stringify(facts).slice(0, MAX_FACTS_LEN);
    const userPromptText = buildUserPrompt(mod, question, factsText);

    let explanation = "";
    let usedProvider = "Cloudflare Workers AI";

    // 1. 優先嘗試使用 Cloudflare Workers AI
    try {
      const ai = context.env.AI;
      if (!ai) throw new Error("未綁定 Workers AI");

      const result = await ai.run(PRIMARY_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPromptText },
        ],
        max_tokens: MAX_TOKENS,
      });

      explanation = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
      if (!explanation) throw new Error("Primary AI 未產生回覆");
    } catch (primaryErr) {
      console.warn("主模型呼叫失敗，嘗試啟動 Gemini 3.5 Flash-Lite 備援...", primaryErr.message);
      
      // 2. 自動切換備援至 Gemini 3.5 Flash-Lite
      explanation = await callGeminiFallback(context.env, SYSTEM_PROMPT, [
        { role: "user", content: userPromptText },
      ]);
      usedProvider = "Google Gemini 3.5 Flash-Lite (Fallback)";
    }

    return jsonResponse({ ok: true, version: ASK_VERSION, provider: usedProvider, explanation });
  } catch (e) {
    return jsonResponse({ error: e?.message || "所有 AI 服務暫時無法存取", version: ASK_VERSION }, 500);
  }
}

export async function onRequestPostChat(context) {
  try {
    const body = await context.request.json().catch(() => null);
    const userMessage = String(body?.message || "").slice(0, MAX_QUESTION_LEN).trim();
    const facts = body?.facts;
    const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];

    if (!userMessage || !facts) {
      return jsonResponse({ error: "缺少訊息或事實資料", version: ASK_VERSION }, 400);
    }

    const factsText = JSON.stringify(facts).slice(0, MAX_FACTS_LEN);
    const sysPromptWithFacts = CHAT_SYSTEM_PROMPT + `\n\n【本次占卜事實資料】：\n${factsText}`;
    const conversationHistory = [...history, { role: "user", content: userMessage }];

    let reply = "";
    let usedProvider = "Cloudflare Workers AI";

    // 1. 優先嘗試使用 Cloudflare Workers AI
    try {
      const ai = context.env.AI;
      if (!ai) throw new Error("未綁定 Workers AI");

      const result = await ai.run(PRIMARY_MODEL, {
        messages: [{ role: "system", content: sysPromptWithFacts }, ...conversationHistory],
        max_tokens: 350,
      });

      reply = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
      if (!reply) throw new Error("Primary AI 未產生回覆");
    } catch (primaryErr) {
      console.warn("主模型對話失敗，嘗試啟動 Gemini 3.5 Flash-Lite 備援...", primaryErr.message);

      // 2. 自動切換備援至 Gemini 3.5 Flash-Lite
      reply = await callGeminiFallback(context.env, sysPromptWithFacts, conversationHistory);
      usedProvider = "Google Gemini 3.5 Flash-Lite (Fallback)";
    }

    return jsonResponse({ ok: true, version: ASK_VERSION, provider: usedProvider, reply });
  } catch (e) {
    return jsonResponse({ error: e?.message || "所有 AI 對話服務暫時無法存取", version: ASK_VERSION }, 500);
  }
}
