# CLAUDE.md

給 Claude Code 在這個 repo 工作時的 context 與規範。功能介紹與部署網址見 [README.md](./README.md)。

## 回應慣例

- 一律用繁體中文回覆；程式識別字用英文，UI 文案、註解、commit message 用繁體中文
- 先講結論，再講原因；問題直接問完，不要寫成預告句就結束
- 解釋行為時用具體情境開頭（「使用者一次拖進 16 張 SVG，第 3 張是 HEIC…」），再用一句話帶到 `檔案:行`

## 專案速覽

**郵輪艙門裝飾工作台（Cruise Door Studio）**：把貼紙排在等比例的郵輪艙門上，照實際尺寸排進紙張，輸出可列印的 PDF。使用者是要去搭郵輪的一般人，多半第一次用、用完就走。

- **純前端、沒有後端**：圖片和排版只存在使用者的瀏覽器（IndexedDB），不會上傳。任何會把資料送出去的功能都要先問
- **單位一律是公釐（mm）**：門、貼紙、紙張的尺寸與座標都是 mm，只有顯示時才換成公分
- **門上 1 公分就是紙上 1 公分**，這是整個工具存在的理由。任何改動都不能讓輸出尺寸跑掉
- 技術棧：Vue 3 `<script setup>` + TypeScript（strict）+ Vite 6 + Pinia + Tailwind CSS v4 + jsPDF + Vitest，圖示用 `lucide-vue-next`
- 部署：推到 `main` 後 GitHub Actions 自動部署到 https://hihiyuru.github.io/cruise-door-studio/（Vite `base` 是 `/cruise-door-studio/`）

## 指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器，網址是 http://localhost:5173/cruise-door-studio/ （**路徑要加 `/cruise-door-studio/`**） |
| `npm test` | Vitest 跑一次 |
| `npm run build` | `vue-tsc -b` 型別檢查 + `vite build` |
| `npm run typecheck` | 只跑型別檢查 |
| `npm run lint` | ESLint（Vue Style Guide＋分層規則），`lint:fix` 自動修排版 |

CI（`.github/workflows/ci.yml`）在 PR 會跑 `npm test` 和 `npm run build`。推之前本機先跑這兩個。

## 目錄

```
src/
  domain/      純邏輯，不碰 DOM：types、doors（門款）、papers（紙張）、geometry（尺寸／碰撞／dpi）、packing（MaxRects 排版與切塊）
  render/      canvas 繪圖：canvas（共用工具）、sticker（白邊與裁切線）、floodFill（去背）、doorSvg、display（畫面用的小圖快取）、samples（範例貼紙）
  export/      pdf（350 dpi、比例尺、ibon 拆檔）、doorPng、download
  storage/     idb（IndexedDB 存檔）、projectFile（專案檔匯出入）
  stores/      project（排版狀態、undo/redo、存檔）、assets（圖片快取，不進 undo）、ui（選取、步驟、toast）
  composables/ useLayout（共用的排版結果）、useFiles（加入圖片）
  components/  介面；AppTopBar、ArrangeStep（LayerList / DoorStage / DoorSettings / InspectorPanel）、PrintStep、BgEditorModal
docs/
  scenario-map.html  情境全圖原始檔（見 scenario-map skill）
```

### 放哪裡

> 完整的程式規範（Vue Style Guide、clean code、分層、命名）在 [docs/code-standards.md](./docs/code-standards.md)，寫 Vue 時也會載入 `.claude/skills/vue-best-practices`。`npm run lint` 會檢查能自動檢查的部分。

- **能不碰 DOM 就放 `domain/`，並寫測試**。尺寸、碰撞、排版、切塊、dpi 都是純數學，測試就近放（`packing.test.ts`）
- 需要 canvas 的放 `render/`；產生檔案給使用者下載的放 `export/`
- 跨元件的狀態放 Pinia store（setup-style）；只有單一元件用的狀態留在元件裡

## 一定要知道的事

### 狀態與存檔

- **排版狀態 `project.p` 是純 JSON，圖片另外放在 `assets`**，貼紙用 `assetId` 指過去。undo 只存 JSON 快照，圖片不會被複製
- **改完狀態要呼叫 `project.commit()`**：它負責記一步 undo，並觸發 600ms 後的自動存檔。拖曳、滑桿這種連續操作，**在結束時（pointerup、change）才 commit**，不要每一格都 commit
- 存進 IndexedDB 的只能是可以 structured clone 的東西：asset 只存 `{ id, blob, isSvg }`，**不要把 canvas 放進去**（會 DataCloneError，整筆存檔失敗）
- `assets` 的 Map 掛在 `globalThis`，開發時熱更新才不會清掉圖片、存下指向不存在圖片的貼紙
- 存檔時只保留目前排版和 undo 歷史用得到的圖片，其餘會刪掉

### 尺寸與輸出

- 貼紙的「成品尺寸」是 `outer()`：圖案寬 `w` 加上兩側的白邊、裁切線和 0.3 mm 邊緣。排版、碰撞、PDF 都用 `outer()`，不要自己加
- PDF 一律 350 dpi（`PRINT_PPM`）。SVG 在輸出時才用 `svgAtWidth` 從向量重新算圖，所以永遠清楚
- **7-11 ibon 會把整頁縮到它能印的範圍**，所以 ibon 的紙張直接做成可印範圍（A3 289 × 405 mm、A4 202 × 283 mm）。改紙張相關的程式時，記得這兩個不是標準 A3／A4
- 每頁底部都有 5 公分比例尺，這是使用者確認印對尺寸的唯一方法，不要拿掉
- 門款資料只放有實測依據的（目前只有探險號）。**不要自己編其他船的尺寸**

### 文案

依 [Microsoft 繁體中文風格指南](https://download.microsoft.com/download/2/9/3/293e6d41-ba40-451b-a41e-94bdb6242ae3/zho-twn-StyleGuide.pdf)（2.1、5.6.2 節）與 NN/g 等錯誤訊息原則整理：

1. **一則提示最多兩句**：第一句說發生什麼，第二句說怎麼辦。成功只要一句
2. **不用術語**：dpi、容許度、解析度、向量、ibon-A3 這類內部名稱不出現在畫面上（紙張名稱用 `paperName()`，`paperShortName()` 只給檔名用）
3. **固定句型**：失敗用「無法…」「找不到…」「記憶體不足，無法…」，成功用「已…」，建議用「建議…」。同一件事只用一種說法（例：「去背」「列印／下載 PDF」「下載備份」「開啟備份」）
4. **省略主詞**：不寫「你」「您」，也不寫「請」
5. **知道下一步才寫**，不硬湊；不怪使用者
6. 完整的句子結尾加句號；按鈕、標籤不加

範例：「無法開啟 IMG_2041.HEIC，改用 JPG 或 PNG。」「圖太小，印出來會糊。」「已刪除「米奇」。［復原］」

### 失敗處理

- 失敗**不會自動跳提示**，每條失敗路徑都要自己處理：
  - 一般失敗用 `useUi().fail(text)`：紅色、不會自己消失
  - 成功或提醒用 `useUi().notify(text, { action })`：會自己消失
  - 存檔問題（存不了、別的分頁改過）由 `SaveBanner` 常駐顯示，不要用 toast
- 會讓人掉東西的操作（刪除、清空、去背、換圖、開啟備份）提示要附「復原」
- 不要用 `filter` 默默丟掉使用者給的東西（例：不是圖片的檔案），要在提示裡講出來
- 瀏覽器原本的錯誤內容（英文）只用 `console.error` 留給除錯，畫面上換成中文
- 不要一次觸發多個下載（瀏覽器會擋），超過一個檔案就列出按鈕讓使用者自己點
- 還沒定案的文案先擬一句，旁邊加 `// TODO:待 Una 確認 —— 原因`

### 樣式

- 用 `src/style.css` 的 tokens（`bg-surface`、`text-muted`、`border-line`、`bg-accent`…），不要寫死顏色。顏色要在 light 和 dark 都看得清楚
- 共用樣式用 `.btn`、`.btn-primary`、`.input`、`.label`、`.link`、`.warnbox`；數字用 `.num`（tabular-nums），不要用等寬字
- 不要加卡片中的卡片、圈圈數字、emoji、unicode 符號當圖示，圖示用 lucide
- 門上貼紙的位置、大小、旋轉是 JS 算出來的，用 inline style；其餘用 Tailwind
- **不要把迪士尼的角色圖、logo 放進 repo**（包括測試用圖）。名稱與網址不用「迪士尼」；門款選項寫「迪士尼郵輪・探險號」是事實描述，可以

## 工作流程

- **做新功能、新步驟前**：判斷要不要盤情境，要的話問一句，說要才用 `scenario-map` skill 畫圖
- **改操作或排版時**：照 `una-ui-ux` skill（使用者層級的 skill）的流程走，交付附上「主要任務路徑」和「控制項異動」
- **驗證**：除了 `npm test` 和 `npm run build`，有改到畫面就實際在瀏覽器走一次主要流程（上傳 → 排版 → 復原 → 列印 → 下載 PDF），並看 375px 寬的手機畫面有沒有左右溢出。改到輸出就用 Ghostscript 檢查 PDF 的頁面尺寸和圖片解析度

## Git

- **不要直接推 `main`**。開分支 → 發 PR → CI 綠燈 → 合併；合併後會自動部署
- 分支名：`<type>/<簡短描述>`，type 用 `feat` / `fix` / `refactor` / `docs` / `chore` / `test`
- 不要從另一個還沒合併的功能分支長出新分支，從 `main` 開
- Commit message：Conventional Commits + 繁體中文，內文寫「為什麼」，可以帶 scope（`fix(print): …`）
