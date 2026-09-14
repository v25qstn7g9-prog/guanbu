/**
 * functions/ask.js — 觀卜 AI 白話說明與靈活追問對話 API
 *
 * POST /ask  : Body { module, question, facts } -> 白話解讀
 * POST /chat : Body { module, question, facts, history, message } -> 追問對話
 *
 * Cloudflare 專案 → Settings → Functions → AI bindings → Variable name: AI
 */
const ASK_VERSION = "guanbu-ask-2.0";
const MODEL = "@cf/openai/gpt-oss-120b";
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

export async function onRequestPost(context) {
  try {
    const ai = context.env.AI;
    if (!ai) {
      return jsonResponse({ error: "尚未設定 AI 綁定，請到 Cloudflare 專案 Settings → Functions → AI bindings 加上 Variable name 為 AI 的綁定。", version: ASK_VERSION }, 500);
    }

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
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(mod, question, factsText) },
    ];

    const result = await ai.run(MODEL, { messages, max_tokens: MAX_TOKENS });
    let explanation = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
    if (!explanation) {
      return jsonResponse({ error: "AI 沒有回傳文字內容", version: ASK_VERSION }, 502);
    }

    return jsonResponse({ ok: true, version: ASK_VERSION, explanation });
  } catch (e) {
    const msg = String(e?.message || "");
    let friendly = msg || "ask function failed";
    if (/neuron|quota|limit|daily|exceeded|usage/i.test(msg)) friendly = "今日 AI 免費額度可能已用完，等額度重置後再試。";
    return jsonResponse({ error: friendly, version: ASK_VERSION }, 500);
  }
}

export async function onRequestPostChat(context) {
  try {
    const ai = context.env.AI;
    if (!ai) {
      return jsonResponse({ error: "尚未設定 AI 綁定", version: ASK_VERSION }, 500);
    }

    const body = await context.request.json().catch(() => null);
    const userMessage = String(body?.message || "").slice(0, MAX_QUESTION_LEN).trim();
    const facts = body?.facts;
    const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];

    if (!userMessage || !facts) {
      return jsonResponse({ error: "缺少訊息或事實資料", version: ASK_VERSION }, 400);
    }

    const factsText = JSON.stringify(facts).slice(0, MAX_FACTS_LEN);
    const messages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT + `\n\n【本次占卜事實資料】：\n${factsText}` },
      ...history,
      { role: "user", content: userMessage }
    ];

    const result = await ai.run(MODEL, { messages, max_tokens: 350 });
    let reply = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
    if (!reply) {
      return jsonResponse({ error: "AI 未能生成對話回覆", version: ASK_VERSION }, 502);
    }

    return jsonResponse({ ok: true, version: ASK_VERSION, reply });
  } catch (e) {
    return jsonResponse({ error: e?.message || "chat function failed", version: ASK_VERSION }, 500);
  }
}
