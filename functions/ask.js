/**
 * functions/ask.js — 觀卜 AI 白話說明與對話 API（支援 中/英/印尼 三語切換 + Gemini 備援）
 */
const ASK_VERSION = "guanbu-ask-2.4";
const PRIMARY_MODEL = "@cf/openai/gpt-oss-120b";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const MAX_QUESTION_LEN = 200;
const MAX_FACTS_LEN = 2500;
const MAX_TOKENS = 600;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_MSG_LEN = 500;
const MAX_BODY_BYTES = 20000;
const ALLOWED_LANGS = new Set(["zh", "en", "id"]);

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
3. 白話且富有靈活性：說話要像一位真誠、貼心的朋友在聊天，避免僵硬的警語格式與生硬術語。
4. 長度與排版：字數控制在 160 ~ 260 字左右（英文/印尼文控制在 100 ~ 150 words），分 2-3 個短段落。
5. 語言回應規定：
   - 若 lang 為 "en"，請全程使用溫暖自然的英文 (English) 回應。
   - 若 lang 為 "id"，請全程使用溫暖自然的印尼文 (Bahasa Indonesia) 回應。
   - 若 lang 為 "zh"，請全程使用繁體中文回應。`;

const CHAT_SYSTEM_PROMPT = `你是「觀卜」App 的靈活諮詢助手。使用者剛完成一次占卜，正在針對該次結果向你追問細節。

【對話原則】
1. 緊扣占卜事實：回答必須嚴格圍繞著剛才算出的「事實資料」（牌義、卦象、星曜、意圖），不得給出矛盾的推測。
2. 溫暖且具建設性：用溫柔、理性且接地氣的口吻解答，引導使用者聚焦在「自己能控制的行動」上。
3. 精煉流暢：每次回覆控制在 100 ~ 180 字之間（外文 60 ~ 100 words）。
4. 語言回應規定：請嚴格根據指示的語言 (English, Bahasa Indonesia, 或 繁體中文) 回答。`;

function buildUserPrompt(mod, question, factsText, lang) {
  let qLine = "";
  let modLabel = "";
  let langInstruct = "";

  if (lang === "en") {
    qLine = question ? `User's Question: "${question}"\n\n` : "No specific question provided. Provide a general reading.\n\n";
    modLabel = { yijing: "I Ching", tarot: "Tarot", runes: "Runes", ziwei: "Zi Wei Dou Shu", daily: "Daily Fortune" }[mod] || "Divination";
    langInstruct = "IMPORTANT: Please reply entirely in English.";
  } else if (lang === "id") {
    qLine = question ? `Pertanyaan Pengguna: "${question}"\n\n` : "Tidak ada pertanyaan spesifik. Berikan ramalan umum.\n\n";
    modLabel = { yijing: "I Ching", tarot: "Tarot", runes: "Runes", ziwei: "Zi Wei Dou Shu", daily: "Ramalan Harian" }[mod] || "Ramalan";
    langInstruct = "PENTING: Harap tanggapi sepenuhnya dalam Bahasa Indonesia yang ramah dan hangat.";
  } else {
    qLine = question ? `使用者目前的心情或問題是：「${question}」\n\n` : "使用者未輸入特定問題，進行整體指引解析。\n\n";
    modLabel = { yijing: "易經占卜", tarot: "塔羅牌", runes: "盧恩符文", ziwei: "紫微斗數命盤", daily: "今日運勢" }[mod] || "占卜";
    langInstruct = "請以繁體中文回應。";
  }

  return `【Type/類型】: ${modLabel}\n${qLine}【Facts Data/事實資料】:\n${factsText}\n\n${langInstruct}`;
}

async function callGeminiFallback(env, systemPrompt, messagesArray) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY Missing");

  const contents = messagesArray.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents,
      generationConfig: { maxOutputTokens: MAX_TOKENS },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini API Error`);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

export async function onRequestPost(context) {
  try {
    const contentLength = Number(context.request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: "Request too large" }, 413);
    const body = await context.request.json().catch(() => null);
    const mod = String(body?.module || "").trim();
    const lang = String(body?.lang || "zh").toLowerCase();
    const allowedModules = new Set(["yijing", "tarot", "runes", "ziwei", "daily"]);
    if (!allowedModules.has(mod)) return jsonResponse({ error: "Invalid module" }, 400);

    const question = String(body?.question || "").slice(0, MAX_QUESTION_LEN).trim();
    const facts = body?.facts;
    if (!facts || typeof facts !== "object") return jsonResponse({ error: "Missing facts" }, 400);

    if (typeof facts !== "object") return jsonResponse({ error: "Invalid facts" }, 400);
    const factsText = JSON.stringify(facts).slice(0, MAX_FACTS_LEN);
    const userPromptText = buildUserPrompt(mod, question, factsText, lang);

    let explanation = "";
    let usedProvider = "Cloudflare Workers AI";

    try {
      const ai = context.env.AI;
      if (!ai) throw new Error("No Workers AI Binding");

      const result = await ai.run(PRIMARY_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPromptText },
        ],
        max_tokens: MAX_TOKENS,
      });

      explanation = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
      if (!explanation) throw new Error("Primary AI Empty");
    } catch (primaryErr) {
      explanation = await callGeminiFallback(context.env, SYSTEM_PROMPT, [{ role: "user", content: userPromptText }]);
      usedProvider = "Google Gemini 3.5 Flash-Lite (Fallback)";
    }

    return jsonResponse({ ok: true, version: ASK_VERSION, provider: usedProvider, explanation });
  } catch (e) {
    return jsonResponse({ error: e?.message || "AI Error", version: ASK_VERSION }, 500);
  }
}

export async function onRequestPostChat(context) {
  try {
    const contentLength = Number(context.request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: "Request too large" }, 413);
    const body = await context.request.json().catch(() => null);
    const userMessage = String(body?.message || "").slice(0, MAX_QUESTION_LEN).trim();
    const lang = String(body?.lang || "zh").toLowerCase();
    if (!ALLOWED_LANGS.has(lang)) return jsonResponse({ error: "Invalid language" }, 400);
    const facts = body?.facts;
    const history = Array.isArray(body?.history)
      ? body.history.slice(-MAX_HISTORY_ITEMS)
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_MSG_LEN) }))
      : [];

    if (!ALLOWED_LANGS.has(lang)) return jsonResponse({ error: "Invalid language" }, 400);
    if (!userMessage || !facts) return jsonResponse({ error: "Missing input" }, 400);

    const factsText = JSON.stringify(facts).slice(0, MAX_FACTS_LEN);
    let langInstruct = "\n請以繁體中文回應。";
    if (lang === "en") langInstruct = "\nIMPORTANT: Reply in English.";
    if (lang === "id") langInstruct = "\nPENTING: Harap jawab dalam Bahasa Indonesia.";

    const sysPromptWithFacts = CHAT_SYSTEM_PROMPT + `\n\n【Facts Data】：\n${factsText}` + langInstruct;
    const conversationHistory = [...history, { role: "user", content: userMessage }];

    let reply = "";
    let usedProvider = "Cloudflare Workers AI";

    try {
      const ai = context.env.AI;
      if (!ai) throw new Error("No Workers AI Binding");

      const result = await ai.run(PRIMARY_MODEL, {
        messages: [{ role: "system", content: sysPromptWithFacts }, ...conversationHistory],
        max_tokens: 350,
      });

      reply = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
      if (!reply) throw new Error("Primary AI Empty");
    } catch (primaryErr) {
      reply = await callGeminiFallback(context.env, sysPromptWithFacts, conversationHistory);
      usedProvider = "Google Gemini 3.5 Flash-Lite (Fallback)";
    }

    return jsonResponse({ ok: true, version: ASK_VERSION, provider: usedProvider, reply });
  } catch (e) {
    return jsonResponse({ error: e?.message || "Chat Error", version: ASK_VERSION }, 500);
  }
}
