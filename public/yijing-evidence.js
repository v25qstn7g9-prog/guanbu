// Limited original topic summaries, not quotations or a complete teaching.
// Only the eight reviewed hexagram-principle entries below use this source.
var YijingEvidence = (() => {
  const sourceUrl = 'https://www.scribd.com/document/836579418/%E5%A4%A9%E7%BA%AA-%E6%98%93%E7%BB%8F';
  const themes = {
    24: ['改正偏差，避免反覆。', [110,111]],
    26: ['節制耗散，積累學識能力。', [116,117]],
    32: ['正當原則可守，方法可變。', [130]],
    34: ['強勢須自制，避免僵局。', [136]],
    37: ['自律、規則與溝通。', [142,143]],
    39: ['遇阻先衡量風險。', [147]],
    40: ['困境初解，重在恢復。', [150]],
    42: ['相互支持，發現錯誤即調整。', [155]]
  };
  const editor = '編輯適用限制（非來源原話/公式）：依明示情境作不保證結果的反思；未知情境保留條件，不補故事。不得從卦推醫療、訴訟、投資結果，不以性別定價值，不延誤受威脅者求助。只用卦理，不混圖占/陽宅/四柱/爻注；無已核動爻取用規則，不作逐爻推演。之卦不等於確定未來，不造時間線。';
  function lookup(number, mode = 'hexagram_principle') {
    if (mode !== 'hexagram_principle' || !Object.hasOwn(themes, number)) return null;
    const [sourceTheme, pages] = themes[number];
    return { hexagramNumber: Number(number), mode, sourceDocId: '836579418', pdfPages: [...pages], sourceTheme,
      epistemicStatus: 'textually_supported_cultural_interpretation', reviewCoverage: 'limited_item_review',
      contextCondition: Number(number) === 40 ? '編輯條件：若使用者明示困境初解，才談恢復；否則僅作假設，不宣稱問題已解決。' : '編輯條件：僅依使用者明示情境反思；主題不證明現況或結果。' };
  }
  function pack(base, present, changed, legacy = {}) {
    const evidence = n => lookup(n) || { hexagramNumber:n, mode:'hexagram_principle', reviewStatus:'not_reviewed' };
    const facts = {...base, PresentNumber:present, FutureNumber:changed,
      SourceNote:'doc836579418《天紀—易經》206頁第三方課程轉寫，非核實官方定本。僅8卦一般主題有限校讀，不認證其餘56卦；沒有逐爻爻辭。來源支持文化詮釋，不證實現實結果。',
      SourceType:'third_party_course_transcription',
      InterpretationEvidence:{Present:evidence(present), Changed:evidence(changed)}, EditorAdaptation:editor,
      LegacyStatus:'unverified third-party/app summaries; reviewed entries superseded_for_this_mode',
      LegacySource:{ project:'Renhuai123/ziwei-doushu', path:'lib/nihai/tianji.ts', revision:'1059c347231c636bd86ddb78fd8ed430d5de8d2a', reviewStatus:'unverified', fields:'PresentDetail/FutureDetail only; PresentMeaning/FutureMeaning are unverified app summaries, not doc836579418' } };
    // Calculated data and complete evidence/limits take priority. Never truncate a negation.
    let omitted = 0;
    for (const key of ['PresentMeaning','PresentDetail','FutureMeaning','FutureDetail']) {
      if (lookup(key.startsWith('Present') ? present : changed) || !legacy[key]) continue;
      if (JSON.stringify({...facts,[key]:legacy[key],InterpretationFieldsOmitted:4}).length <= 2500) facts[key]=legacy[key];
      else omitted++;
    }
    if (omitted) facts.InterpretationFieldsOmitted=omitted;
    if (JSON.stringify(facts).length > 2500) throw new Error('Facts too large');
    return facts;
  }
  return { sourceUrl, reviewedNumbers:Object.keys(themes).map(Number), lookup, pack };
})();
