# 程式規範

寫 code 和 code review 都照這份。能機器檢查的交給 `npm run lint`（設定在 `eslint.config.js`），其餘在 review 時人工看。

來源：
- [Vue 官方 Style Guide](https://vuejs.org/style-guide/)（A 必要、B 強烈建議）
- [vue-best-practices skill](../.claude/skills/vue-best-practices/SKILL.md)（vuejs-ai，MIT，來源 hyf0/vue-skills）
- Clean Code 的通用原則（命名、函式、註解、錯誤處理）

## 1. Vue

**A 必要**（[rules-essential](https://vuejs.org/style-guide/rules-essential)）
- 元件名稱至少兩個字，只有 `App` 例外。
- props 用 TypeScript 型別宣告（`defineProps<{ … }>()`），不要用陣列寫法。
- `v-for` 一定要有唯一的 `key`；`v-if` 不和 `v-for` 放在同一個元素，先用 `computed` 過濾。
- 元件自己的 `<style>` 要加 `scoped`；其他樣式用 Tailwind class。

**B 強烈建議**（[rules-strongly-recommended](https://vuejs.org/style-guide/rules-strongly-recommended)）
- 一個元件一個檔，檔名 PascalCase。
- 只在某個父元件裡用的子元件，名稱用父元件名當前綴（例：`PrintStep` 裡的 → `PrintStepSheetList`）。
- 名稱用完整單字，不縮寫（`BackgroundEditor`，不寫 `BgEditor`）。
- 一個元素有多個屬性時，一行一個（lint 自動修）。
- **template 只放簡單運算式**。有 `&&`／`||` 組合、用到兩次以上，或需要一個名字才看得懂的，抽成 `computed`；函式呼叫的結果不要在 template 裡重複算。
- `computed` 太長就拆成幾個有名字的小 `computed`。
- 指令一律用縮寫（`:`、`@`、`#`）。

**vue-best-practices**
- 狀態只保留一份來源，其他用 `computed` 推導，不要另存一份再同步。
- 資料流向：props 往下傳、events 往上傳。子元件要改共用狀態時，透過 store 的 action，不要直接改 props。
- **一個元件只做一件事**。符合任一條件就要拆：有 3 個以上獨立的畫面區塊；同時處理狀態和大量畫面；有一段 template 重複出現。
- 狀態和副作用（事件監聽、計時器、IndexedDB）放進 composable，元件裡只留畫面需要的部分。

## 2. Clean code

- **命名看得出用途**：變數用名詞，函式用動詞開頭；不要用 `data`、`tmp`、`x2` 這類名字。迴圈裡的短變數（`i`、`p`）只在三行以內可以用。
- **函式小、只做一件事**：超過 40 行，或需要用註解分段的，就拆開。
- **不要有沒解釋的數字**：除了 0、1、2 這種一看就懂的，其他數字都要給常數名稱，並註解從哪來（例：`IBON_MAX_BYTES = 8 MB // ibon 單檔上傳上限`）。
- **不要重複**：同樣的邏輯出現第二次就抽出來，放在兩邊都看得到的地方。
- **註解寫為什麼，不寫做了什麼**：程式碼本身說不清楚的原因、限制、踩過的坑才寫。
- **錯誤不默默吞掉**：`catch` 要嘛處理（提示使用者，見 CLAUDE.md「失敗處理」），要嘛寫註解說明為什麼可以忽略。

## 3. 分層與依賴方向

```
domain        純邏輯：尺寸、碰撞、排版、紙張、門款。不碰 DOM、store、元件
   ↑
render        canvas 繪圖、圖片處理
storage       IndexedDB、專案檔格式
   ↑
export        產生 PDF、PNG、下載
   ↑
stores        Pinia：排版狀態、圖片快取、介面狀態
composables   給元件用的邏輯（useXxx）
   ↑
components    畫面
```

- **下層不能 import 上層**，lint 的 `no-restricted-imports` 會擋。
- 下層需要上層的資料時，由呼叫端當參數傳進來。例：`export/pdf.ts` 需要圖片，就讓呼叫端傳入「依 id 取圖片」的函式，不要直接 import `stores/assets`。
- 能放 `domain` 的就放 `domain`，並寫測試（`*.test.ts` 就近放）。

## 4. 命名

| 東西 | 規則 | 例 |
|---|---|---|
| 元件檔 | PascalCase、多個字、不縮寫 | `StickerToolbar.vue` |
| 只給某個元件用的子元件 | 父元件名當前綴 | `PrintStepSheetList.vue` |
| composable | `useXxx`，檔名和函式名一致 | `usePrintSettings.ts` → `usePrintSettings()` |
| store | `useXxx`，檔名是名詞 | `stores/project.ts` → `useProject()` |
| 一般函式 | 動詞開頭 camelCase | `layoutSheets`、`renderSticker` |
| 常數 | `UPPER_SNAKE` | `PRINT_PPM`、`OVERLAP` |
| 布林值 | `is`／`has`／`can`／`should` 開頭 | `isCustom`、`hasSamples` |
| 事件處理函式 | `onXxx` | `onPick`、`onDoorChange` |
| 有單位的數字 | 單位寫進名稱，除非整個專案都同一單位 | `widthPx`、`marginMm`（mm 是預設，見 CLAUDE.md） |
| 縮寫 | 只用業界通用的（`pdf`、`svg`、`dpi`、`ppm` 要在宣告處註解） | `ppm // pixels per millimetre` |

## 5. 元件寫法

- 區塊順序：`<script setup lang="ts">` → `<template>` → `<style scoped>`。
- `<script setup>` 內的順序：import → `defineProps`／`defineEmits` → `ref` → `computed` → `watch` → 生命週期 → 函式。
- 事件監聽、計時器都要在 `onBeforeUnmount` 清掉。
- 文字依 CLAUDE.md「文案」6 條規則寫。
