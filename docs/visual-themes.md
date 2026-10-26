# 三款可切換版面

預設 **② 靜謐精品**；另提供 **① 東方留白** 與 **③ 現代編輯**。
只改顏色、留白、字體層級、圓角與視覺主題選擇器，不改排盤、起卦、AI、書面資料或手動填爻邏輯。

`public/themes.css` 的三個具名 token 區塊是獨立、opt-in 的 Forma 主題紀錄；淺色中性色沿用中央 Forma 的 training-light-sage、sihub、training-light-sea，深色使用此核准方向的炭灰／橄欖／香檳角色。可將這三段作為中央 Forma 同步提案；本 PR 不修改另一個儲存庫。

`public/themes.js` 僅讀寫 `guanbu-theme` 偏好與根元素的 `data-forma-theme`，不重新產生占卜、不修改輸入或結果。儲存不可用時仍可切換。主題名稱隨既有三語介面更新。

驗收：`npm test` 包含主題持久化／失敗回退、切換不重算、所有五模組在 320/375/430/1280px 的溢出／觸控／字級檢查、雙欄填爻、鍵盤焦點及 reduced motion。瀏覽器測試將三款主題、五模組的手機與桌面完整截圖寫入 `test-artifacts/source-review/themes/`，由既有 PR CI 上傳。
