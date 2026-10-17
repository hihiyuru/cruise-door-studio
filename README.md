# 郵輪艙門裝飾工作台 · Cruise Door Studio

把貼紙排在**等比例的郵輪艙門**上，再照**實際尺寸**排進紙張、輸出可列印的 PDF。門上 1 公分，印出來就是 1 公分。

🔗 https://hihiyuru.github.io/cruise-door-studio/

> 非迪士尼官方工具。圖片只存在你自己的瀏覽器（IndexedDB），不會上傳到任何地方。

## 能做什麼

- **排在門上**：拖曳、縮放、旋轉；門牌、貓眼、門鎖附近標出不能貼的區域，蓋到會提醒。
- **去背**：點背景顏色去掉、從四邊自動去背、收邊；可加白邊與灰色裁切線，方便手剪。
- **印出來**：先選在哪裡印（7-11 ibon／印刷店／家用印表機），自動用最少張數排版，輸出 350 dpi PDF，每張附 5 公分比例尺。
  - **ibon**：頁面直接做成 ibon 可印範圍（A3 28.9 × 40.5 cm），不會被機台縮放；檔案太大自動拆檔。
  - 大圖可以「切成幾塊自己拼」（每塊重疊 1 公分），或一鍵縮到一張印得下。
  - 向量 SVG 在輸出時重新算圖，印多大都清楚；點陣圖解析度不足會提醒。
- **不怕掉資料**：自動儲存、復原／重做（⌘Z），可匯出／匯入專案檔換電腦繼續做。

## 門款

| 門款 | 尺寸 | 來源 |
| --- | --- | --- |
| 迪士尼郵輪・探險號（Disney Adventure） | 73 × 197 cm | 公開的艙門實測圖：門牌 Ø20.5 cm、門牌上緣距門頂 15.7 cm、貓眼在門牌下 20 cm、門鎖區距門頂 79 cm |
| 自訂尺寸 | 任意 | 只有長寬，沒有門上配件 |

有其他船的實測尺寸歡迎開 issue。

## 開發

```bash
npm install
npm run dev        # http://localhost:5173/cruise-door-studio/
npm test           # Vitest：排版、切塊、禁貼區判斷
npm run build      # vue-tsc 型別檢查 + Vite build
```

技術：Vue 3、TypeScript、Pinia、Tailwind CSS v4、jsPDF、Vitest。

```
src/
  domain/     純邏輯：門款、紙張、幾何、MaxRects 排版與切塊（有測試）
  render/     canvas：白邊（dilate）、去背（flood fill）、門的 SVG
  export/     PDF（350 dpi、比例尺、ibon 拆檔）、門的預覽圖
  storage/    IndexedDB 存檔、專案檔匯出匯入
  stores/     Pinia：專案狀態（含 undo/redo）、圖片、介面狀態
  components/ 介面
```

推到 `main` 後由 GitHub Actions 自動部署到 GitHub Pages。

## 授權

MIT
