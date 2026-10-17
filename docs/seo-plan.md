# SEO 與門款修正：交接文件

> 2026-10-18 整理。下一個 session 從這裡接著做。分支：`feat/seo`（已推上 GitHub，**還沒開 PR、還沒合併**）。

## 目標

讓搜尋「迪士尼郵輪 房門尺寸」「探險號 房門裝飾」「Disney Adventure door size」這類關鍵字的人，可以找到 https://hihiyuru.github.io/cruise-door-studio/ 。

## 目前狀態（`feat/seo` 分支上已經做好的）

- `index.html`
  - 改了標題和 meta description
  - 加上 canonical、Open Graph／Twitter 分享預覽、`theme-color`
  - 加上 JSON-LD（WebApplication＋FAQPage）
  - 在 `#app` 下方加了一段純 HTML 的「迪士尼郵輪探險號艙門裝飾指南」：尺寸、哪裡不能貼、要用磁鐵、怎麼照實際尺寸印、常見問題
- `public/robots.txt`、`public/sitemap.xml`、`public/og-image.png`（1200×630 分享預覽圖，自己畫的，沒有迪士尼圖）
- 已驗證：build 正常、JSON-LD 格式正確、35 個 e2e 情境測試全部通過

**這些內容還要依下面的發現修改**，見「待辦」。

## 這次查到的資料

### 1. 大家實際怎麼搜尋（Google 自動完成，2026-10-18 查詢）

| 輸入 | 自動補出來的詞 |
|---|---|
| 迪士尼郵輪 門 | 門裝飾、**門 尺寸**、門口佈置、門口裝飾、**門的尺寸**、門貼 |
| 迪士尼郵輪 房門 | 房門佈置、房門裝飾、**房門尺寸** |
| 迪士尼郵輪 磁鐵 | **磁鐵製作** |
| 郵輪 門 | 門 裝飾、門 貼、門 磁鐵、門 佈置、迪士尼 郵輪 門 尺寸 |
| 迪士尼邮轮 门（簡體） | **门 尺寸**、门的尺寸、门 装饰、门口布置 |
| disney adventure door | **door dimension**、**door size in cm**、door decoration、door decoration rules、door magnet |
| disney cruise door | door decoration、door magnets、door ideas、door decoration rules、**door dimensions**、door size、free printables |
| 探險號 | 只有迪士尼、郵輪、餐廳、房型、攻略、wifi 等，**沒有和門有關的詞** |

**結論**
- **「門的尺寸」是最大的需求**，繁體、簡體、英文都出現了。我們有等比例的門和實測尺寸，這是最強的切入點。
- 大家說的是「**房門／門口佈置、門裝飾、門貼、磁鐵製作**」，很少人說「艙門」「門飾」。
- 「探險號」本身搜尋量大，但沒有人搭配「門」來搜 → 標題以「迪士尼郵輪 房門」為主、「探險號」為輔。
- 有**簡體中文**需求（新加坡、馬來西亞、中國旅客）。
- 英文需求很明確：door magnets、printable、DIY、door dimensions、magnet planner。

### 2. Google 官方的 SEO 建議

- Google **主要透過其他網站的連結**找到網站；sitemap 只是輔助。**最重要的是有人分享、有人連過來。**
- 標題要獨一無二、清楚、準確描述內容；搜尋結果的摘要通常取自頁面上的文字。
- 內容要寫給人看：好讀、有段落標題、正確、跟得上最新資訊。
- **不用在意**：`meta keywords`（Google 不使用）、硬塞關鍵字（違反規範）、字數、網域名稱裡有沒有關鍵字。
- JavaScript 網站 Google 會渲染，但會延後；官方仍建議**預先渲染**，讓內容直接寫在 HTML 裡。
- **FAQ 搜尋結果已經停止顯示**，2026 年 6 月會移除相關工具。FAQPage 的 JSON-LD 沒有效果，可以拿掉；常見問題的文字本身仍然有用。
- 效果要等**幾週**再判斷。

### 3. 🔴 門的尺寸和程式不一致（比 SEO 更優先）

迪士尼官方 planDisney 的回答：

| 房型 | 官方約略尺寸 | 程式目前 |
|---|---|---|
| 一般／豪華艙房 | **71 × 195 cm**，門牌直徑 20.5 cm、上緣距門頂約 15.5 cm | 73 × 197 cm |
| 禮賓艙房 Concierge | **73.5–74 × 197 cm** | 沒有區分 |

- 官方**沒有**門把、貓眼、門鎖、感應器的確切位置。
- 門框也有磁性。
- 程式目前的 73 × 197 cm（`src/domain/doors.ts` 的 `ADVENTURE`）比較接近**禮賓房**的門。

### 4. 房門裝飾的規定（可以寫進說明文字）

- 只能用**磁鐵**，不能用膠帶、膠水、無痕掛鉤。
- 只能貼在**自己的房門**，走廊牆面、天花板不行（防火與疏散安全）。
- **禁止使用掛在門上方的掛鉤或掛架**（over-the-door hanger），會刮傷烤漆。
- 避開房號、貓眼、門鎖感應區；下船前要復原。
- 官方建議用表面光滑的磁鐵，避免刮傷門。

### 5. ChatGPT 的研究（Una 另外問的）

和上面大致一致，可以互相印證。另外補充：
- 英文市場的關鍵字整理（door magnets、printable、DIY、door dimensions、magnet planner）。
- 建議主打的差異：「上傳自己的圖 → 照實際尺寸排版 → 自動排進 A4／A3、7-11 就能印」這一整套流程。
- 它提到一個很相似的競爭工具「**Adventure Deck — Your Door Magnet Studio**」（標題是「Disney Adventure Door Measurements & Magnet Planner」）。**我用兩組關鍵字都查不到**，需要 Una 提供 ChatGPT 給的網址再確認。
- 它說「網站圖示路徑要修」是錯的：`/favicon.svg` 這種寫法 Vite 會自動補上 base，打包和正式網站都已驗證正常。
- 它的網站健檢是看 main 的舊版，所以說 canonical、OG、sitemap 都沒做；這些在 `feat/seo` 上已經做好。

## 待辦（依順序）

1. **🔴 先問 Una：門款要不要拆成兩種？**（建議要）
   - 「迪士尼探險號・一般艙房（約 71 × 195 cm）」與「迪士尼探險號・禮賓艙房（約 73.5 × 197 cm）」
   - 門牌位置用官方數據（直徑 20.5 cm、上緣距門頂約 15.5 cm）；門把、貓眼、門鎖位置沒有官方資料，沿用目前的實測圖，並在「尺寸依據」寫清楚「約略值，出發前最好自己量」
   - 會動到：`src/domain/doors.ts`、`DOOR_OPTIONS`、`DoorSettings.vue`、`domain/projectSchema.ts`（doorId）、e2e 與單元測試、`docs/scenario-map.html`
   - 舊存檔的 `doorId: 'disney-adventure'` 要對應到其中一種（建議禮賓房，因為尺寸跟原本一樣，排版不會跑掉）
2. **改 `index.html` 的文案**（照「大家實際怎麼搜尋」）
   - 標題主打「房門尺寸＋房門裝飾」，例：`迪士尼探險號房門尺寸與裝飾排版｜磁鐵 DIY、照實際尺寸列印`
   - 說明文字**以房門尺寸開頭**，分一般房和禮賓房；加入「禁止門上方掛鉤」等規定
   - 自然地用到：房門裝飾、房門佈置、門口佈置、門貼、磁鐵製作；英文 door size／door magnets 寫一兩句就好
   - **拿掉** FAQPage 的 JSON-LD 和 `meta keywords`（保留 WebApplication）
   - 所有新文案照 `CLAUDE.md`「文案」6 條規則
3. **更新 og-image** 上的尺寸文字（目前寫 73 × 197 cm）
4. 發 PR → CI（lint／單元／e2e）通過 → 合併（main 有分支保護，一定要走 PR）
5. **Una 自己要做**
   - Google Search Console：新增資源（網址前綴 `https://hihiyuru.github.io/cruise-door-studio/`）→ 用 HTML meta 標籤驗證（把 Google 給的那一行貼給 Claude 加進 `index.html`）→ 提交 `sitemap.xml` → 用「網址檢查」請求建立索引
   - Bing Webmaster Tools：可以直接從 Search Console 匯入
   - 到迪士尼郵輪 FB 社團、Threads、小紅書、PTT、Dcard 分享，連結回網站
6. **之後再做**
   - 英文說明頁（主打 Disney Adventure door magnet planner／door size in cm）
   - 簡體中文的內容或頁面
   - 確認「Adventure Deck」是否存在，研究它的做法

## 參考資料

- [Google SEO 入門指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google JavaScript SEO 基本知識](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google 2023 HowTo／FAQ 搜尋結果變更](https://developers.google.com/search/blog/2023/08/howto-faq-changes?hl=ko)
- [Search Engine Journal：Google 停止顯示 FAQ 搜尋結果](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/)
- [planDisney：探險號房門裝飾問答](https://plandisney.disney.go.com/question/planning-decorate-stateroom-door-coming-disney-adventure-633908/)
- [planDisney：探險號豪華艙房門飾問答](https://plandisney.disney.go.com/question/ill-staying-deluxe-stateroom-disney-adventure-decorations-639389/)
- [planDisney：門框是否有磁性與門的尺寸](https://plandisney.disney.go.com/question/frames-stateroom-doors-magnetic-dimensions-door-put-343608/)
- [planDisney：房門尺寸問答](https://plandisney.disney.go.com/question/im-room-number-category-deck-aft-know-door-size-whether-637683/)
- [Laughing Place：探險號房門磁鐵組（禁用門上方掛鉤）](https://www.laughingplace.com/disney-parks/disney-adventure-stateroom-magnet-set/)
- [sainteat：新加坡迪士尼郵輪房門佈置與 FE 文化](https://sainteat.tw/disney-cruise-fe/)
- [永安旅遊：迪士尼郵輪的房門裝飾文化](https://www.wingontravel.com/travel/feature/%E8%BF%AA%E5%A3%AB%E5%B0%BC%E9%83%B5%E8%BC%AA%E6%88%BF%E9%96%80%E8%A3%9D%E9%A3%BE%E6%96%87%E5%8C%96/)
- [Vivian Explore：新加坡迪士尼探險號全攻略](https://vivianexplore.tw/disney-adventure-cruise-singapore/)
- Google 自動完成：`https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-TW&gl=tw&q=<關鍵字>`（可以用 WebFetch 重查）
