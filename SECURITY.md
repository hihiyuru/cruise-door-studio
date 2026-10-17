# 安全性

這是純前端網站：圖片和排版只存在使用者自己的瀏覽器，不會上傳到任何伺服器。

- 開啟的備份檔一律視為不可信任：每個欄位都會檢查型別和範圍（`src/domain/projectSchema.ts`），只接受檔案內嵌的圖片，不會去抓檔案裡的任何網址。
- 正式網站帶有 Content Security Policy（`vite.config.ts`），只執行本站的程式。
- Dependabot 每週檢查套件更新。

發現安全問題請透過 GitHub 的 [Private vulnerability reporting](https://github.com/hihiyuru/cruise-door-studio/security/advisories/new) 回報，不要開公開 issue。
