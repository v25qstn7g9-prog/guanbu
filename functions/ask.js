/**
 * functions/ask.js — 觀卜 AI 白話說明
 *
 * POST /ask
 * body: {
 *   module: "yijing" | "tarot" | "runes" | "ziwei" | "daily",
 *   question?: string,       // 使用者輸入的問題（易經/塔羅/符文可能有）
 *   facts: object            // 已經算好的「事實資料」（卦名、牌名、星曜等），AI 只能解釋這些，不能自己編
 * }
 * 回傳: { ok: true, explanation } 或 { error }
 *
 * Cloudflare 專案 → Settings → Functions → AI bindings → Variable name: AI
 */
const ASK_VERSION = "guanbu-ask-1.0";
const MODEL = "@cf/openai/gpt-oss-120b";
const MAX_QUESTION_LEN = 200;
const MAX_FACTS_LEN = 2000;
const MAX_TOKENS = 500;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}

const SYSTEM_PROMPT = `你是「觀卜」App 裡的占卜說明助手，工作是把已經算好的占卜結果，
轉換成國小高年級到國中生都看得懂的白話說明。

【最重要的規則】
- 你只能解釋系統提供給你的「事實資料」（卦名、牌名、星曜、宮位等），絕對不可以自己另外編一個卦、
  另外編一張牌、或編造事實資料裡沒有的內容。事實資料是唯一真相，你的工作只是把它講得簡單易懂。
- 用詞要簡單、口語、像在跟國中生聊天解釋一件事，避免文言文、專有名詞（如「化氣」「廟旺陷」這種）、
  避免長句子。可以用「就是」「意思是」「簡單說」這種口語連接詞。
- 如果使用者有輸入具體問題，說明時要盡量貼著這個問題講，讓使用者感覺這是「針對他的問題」的解釋，
  不是通用罐頭文字。
- 字數控制在 150~220 字之間，手機小螢幕要看得完，分兩三段小段落即可，不用列點條列。
- 結尾可以有一句溫和提醒：這只是占卜遊戲/命理參考，不是絕對答案，重大決定還是要自己判斷；
  但不要每次都用一模一樣的句子，稍微換句話說。
- 不要给醫療、法律、投資的具體建議。`;

function buildUserPrompt(mod, question, factsText) {
  const qLine = question ? `使用者的問題是：「${question}」\n\n` : "";
  const modLabel = { yijing: "易經占卜", tarot: "塔羅牌", runes: "盧恩符文", ziwei: "紫微斗數命盤", daily: "今日運勢" }[mod] || "占卜";
  return `這是一次「${modLabel}」的結果。\n\n${qLine}已經算好的事實資料如下（只能解釋這些，不能新增）：\n${factsText}\n\n請用國中生看得懂的白話，把這個結果解釋清楚。`;
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

    let explanation = String(result?.response || "").trim();
    if (!explanation && Array.isArray(result?.choices)) {
      explanation = String(result.choices[0]?.message?.content || "").trim();
    }
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
