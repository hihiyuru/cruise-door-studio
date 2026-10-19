import type { Paper } from '../../domain/papers'
import { standardPaperName } from '../../domain/papers'
import type { PrintPlace } from '../../domain/types'

/**
 * Every piece of text on screen, in Traditional Chinese. This is the source locale: the other locales are typed
 * against it, so a missing key or a different set of parameters fails the type check.
 * Copy follows the 文案 rules in CLAUDE.md.
 */
export const zhHant = {
  /** BCP 47 tag for dates and times. */
  timeTag: 'zh-TW',
  list: (items: string[]) => items.join('、'),

  app: {
    title: '郵輪艙門裝飾工作台',
    loading: '正在讀取上次的排版…',
    footer: '非迪士尼官方工具・圖片只存在這台電腦的瀏覽器，不會上傳・艙門是金屬門，裝飾要用磁鐵固定',
    nothingToRedo: '沒有可以重做的步驟了。',
    nothingToUndo: '沒有可以復原的步驟了。',
    lostPictures: (n: number) => `找不到 ${n} 張圖，已從門上移除。`,
  },

  topBar: {
    back: '回到門上',
    saving: '儲存中…',
    saveFailed: '無法自動儲存',
    savePaused: '暫停儲存',
    saved: '已自動儲存',
    savedAt: (time: string) => `已自動儲存 ${time}`,
    undo: '復原',
    undoTitle: '復原（⌘Z）',
    redo: '重做',
    redoTitle: '重做（⇧⌘Z）',
    backup: '備份',
    downloadBackup: '下載備份',
    downloadBackupHint: '排版和圖片存成一個檔案，換電腦也能接著做',
    openBackup: '開啟備份',
    openBackupHint: '會取代目前的排版，可以復原',
    print: '列印／下載 PDF',
    sheetCount: (n: number) => `（${n} 張）`,
  },

  backup: {
    fileName: (stamp: string) => `艙門裝飾專案-${stamp}.json`,
    downloaded: '已下載備份。換電腦時用「開啟備份」接著做。',
    downloadFailed: '記憶體不足，無法下載備份。先刪掉幾張大圖再試一次。',
    opened: '已開啟備份。',
    openedWithLost: (n: number) => `已開啟備份，但找不到 ${n} 張圖，已從門上移除。`,
    notBackup: '無法開啟，這不是備份檔。',
    openFailed: '無法開啟，檔案可能已損毀。',
  },

  saveBanner: {
    failed: '無法自動儲存，關掉前先備份。',
    conflict: '另一個分頁改過排版，這裡的修改暫停儲存。',
    reload: '載入最新',
    keepThisTab: '保留這裡的版本',
  },

  toast: {
    undo: '復原',
    close: '關閉',
  },

  samples: {
    badge: '範例：圓章',
    star: '範例：星星',
    flag: '範例：旗子',
  },

  stickers: {
    region: '貼紙清單',
    add: '加入圖片',
    addHint: 'PNG、JPG、SVG。也可以拖進來或貼上。',
    title: '貼紙',
    clearSamples: '清掉範例',
    samplesCleared: '已清掉範例。',
    empty: '門上還沒有貼紙。',
    restoreSamples: '放回範例貼紙',
    width: (cm: string) => `寬 ${cm} cm`,
    covers: (zones: string) => `蓋到${zones}`,
    clearAll: '清空全部貼紙',
    confirmClearAll: (n: number) => `再按一次，刪掉全部 ${n} 張`,
    cleared: (n: number) => `已清空 ${n} 張。`,
    pastedName: '貼上的圖片',
    added: (n: number) => (n > 1 ? `已加入 ${n} 張。` : '已加入。'),
    cannotOpen: (names: string) => `無法開啟 ${names}，改用 JPG 或 PNG。`,
    deleted: (name: string) => `已刪除「${name}」。`,
  },

  door: {
    region: '門的設定',
    stage: '艙門',
    title: '門',
    model: '門款',
    names: {
      'disney-adventure': '迪士尼郵輪・探險號（Disney Adventure）',
      custom: '自訂尺寸',
    } as Record<string, string>,
    customOption: '自訂尺寸…',
    notes: {
      'disney-adventure': '約略尺寸，出發前建議自己量一次。門牌直徑 20.5 cm、門牌上緣距門頂約 15.5 cm、貓眼在門牌下 20 cm、門鎖區距門頂 79 cm。',
      custom: '自訂尺寸的門不會畫出門牌、門鎖，也沒有禁貼區。',
    } as Record<string, string>,
    widthMm: '寬（mm）',
    heightMm: '高（mm）',
    roomNo: '門牌號碼（只影響預覽）',
    showKeepOut: '標出不能貼的區域',
    grid: '10 公分格線',
    basis: '尺寸依據',
    size: (w: number, h: number) => `${w} × ${h} cm。`,
    hint: '點貼紙就能調整大小、去背和白邊。',
    /** No-stick zones, as listed in a sticker's accessible name and the layer list. */
    zones: {
      roomNumber: '門牌',
      peephole: '貓眼',
      lock: '門鎖和門把',
      outside: '門外',
    },
    /** Shorter zone names for the warning in the sticker panel. */
    zonesShort: {
      roomNumber: '門牌',
      peephole: '貓眼',
      lock: '門把',
      outside: '門外',
    },
  },

  sticker: {
    accessibleName: (name: string, cm: string) => `${name}，寬 ${cm} 公分`,
    accessibleCovers: (zones: string) => `，蓋到${zones}`,
    resize: '拖曳縮放',
    rotate: '拖曳旋轉',
  },

  toolbar: {
    region: '貼紙工具',
    removeBackground: '去背',
    duplicate: '複製',
    duplicateTitle: '複製一張',
    delete: '刪除',
    deleteTitle: '刪除（Delete 鍵）',
  },

  inspector: {
    region: '貼紙設定',
    name: '名稱',
    renameTitle: '點一下可以改名稱',
    deselect: '取消選取',
    width: '寬度',
    finished: (w: string, h: string) => `成品 ${w} × ${h}`,
    rotation: '旋轉',
    straighten: '轉正',
    border: '白邊',
    cutLine: '外圍加灰色裁切線',
    inTheWay: (zone: string) => `擋到${zone}了，挪開一點。`,
    offDoor: '超出門外了。',
    blurry: '圖太小，印出來會糊。',
    fitsOne: (paper: string) => `${paper} 一張印得完。`,
    willSplit: (paper: string, n: number) => `${paper} 印不下，會分成 ${n} 張印。`,
    doesNotFit: (paper: string) => `${paper} 印不下。`,
    changePrintTitle: '換列印地點或紙張',
    shrinkTo: (cm: string) => `縮到 ${cm} cm`,
    tile: '分成幾張印，自己拼',
    tooSmallToSplit: '紙張太小，無法分張印。',
    removeBackground: '去背',
    replace: '換圖',
    replaced: '已換圖。',
    duplicate: '複製',
    mirror: '左右對稱複製',
    mirrorTitle: '在門的另一側對稱位置複製一張',
    toTop: '移到最上層',
    toBottom: '移到最下層',
    delete: '刪除',
  },

  editor: {
    canvas: '點一下要去掉的背景顏色',
    title: '去背',
    hint: '點背景，同色的部分會一起去掉。',
    auto: '自動去背',
    range: '去除範圍',
    global: '不相連的同色也去掉',
    shave: '修白邊',
    undo: '上一步',
    reset: '回到原圖',
    /** Split around the remove.bg link. */
    busyPhotoBefore: '背景很雜的照片，建議先用',
    busyPhotoAfter: '去背。',
    cancel: '取消',
    apply: '套用',
    nothingHere: '這裡沒有背景了。',
    alreadyClean: '背景已經去乾淨了。',
    nothingToUndo: '沒有上一步了。',
    notApplied: '還沒套用。按「套用」保留，按「取消」放棄。',
    allRemoved: '整張都被去掉了，按「上一步」。',
    applied: '已去背。',
    applyFailed: '記憶體不足，無法套用去背。',
  },

  places: {
    ibon: { label: '7-11 ibon', hint: '一般紙，A3 彩色一張約 20 元。' },
    shop: { label: '印刷店', hint: '可以選相紙和大尺寸。' },
    home: { label: '家用印表機', hint: '以 A4 為主。' },
  } satisfies Record<PrintPlace, { label: string; hint: string }>,

  paper: {
    /** Name shown to people: A3, A4, A3 加大, or the custom size. */
    name: (p: Paper) => (p.id === 'custom' ? `${p.w} × ${p.h} mm` : p.id === 'a3plus' ? 'A3 加大' : standardPaperName(p)),
    /** Option in the paper list; ibon pages are already the printable area, so their size is left out. */
    option: (p: Paper, place: PrintPlace) => {
      if (p.id === 'custom') return `自訂（${p.w} × ${p.h} mm）`
      const name = p.id === 'a3plus' ? 'A3 加大' : standardPaperName(p)
      return place === 'ibon' ? name : `${name}（${p.w / 10} × ${p.h / 10} cm）`
    },
    /** Short name used in file names. */
    fileName: (p: Paper, place: PrintPlace) => {
      if (p.id === 'custom') return `${p.w}x${p.h}mm`
      const base = p.id === 'a3plus' ? 'A3加大' : standardPaperName(p).toUpperCase()
      return place === 'ibon' ? `ibon-${base}` : base
    },
    customOption: '自訂尺寸…',
  },

  printSettings: {
    where: '在哪裡印',
    paper: '紙張',
    widthMm: '寬（mm）',
    heightMm: '高（mm）',
    pickerTitle: '列印地點與紙張',
    printAt: '印在',
    summary: (place: string, paper: string) => `${place}・${paper}`,
  },

  print: {
    region: '印刷設定',
    previewRegion: '每一張的預覽',
    /** Split around the bold numbers. */
    totalBefore: '共',
    totalSheets: (paper: string) => `張 ${paper}`,
    costBefore: '，約',
    costAfter: '元',
    empty: '門上還沒有貼紙。',
    download: '下載 PDF',
    preparing: '準備中…',
    progress: (done: number, total: number) => `產生中 ${done} / ${total} 張…`,
    fileBase: (paper: string, n: number) => `艙門貼紙_${paper}_${n}張`,
    partFile: (base: string, from: number, to: number) => `${base}_第${from}-${to}張.pdf`,
    partLabel: (from: number, to: number) => `第 ${from}–${to} 張`,
    downloaded: '已下載 PDF。',
    splitFiles: (n: number) => `檔案較大，已分成 ${n} 個 PDF。`,
    missingArtwork: (name: string) => `找不到「${name}」的圖，無法產生 PDF。換圖或刪掉這張再試一次。`,
    outOfMemory: '記憶體不足，無法產生 PDF。先縮小最大的幾張。',
    partsHint: '每個都要下載，到 ibon 也要每個都傳。',
    partDone: '已下載',
    ibonTip: '先印一張，確認比例尺是 5 公分。',
    shopTip: '照實際大小印。需要 CMYK 的話，交給店家轉。',
    homeTip: '列印時選「實際大小」，不要選「符合頁面」。',
    tiled: (name: string, n: number, label: string) => `「${name}」分成 ${n} 張印（${label}-1～${label}-${n}），拼的時候疊 1 公分對齊。`,
    tooBig: (paper: string) => `這幾張 ${paper} 印不下：`,
    shrinkTo: (cm: string) => `縮到 ${cm} cm`,
    split: '分成幾張印',
    shrunk: (cm: string) => `已縮到 ${cm} cm。`,
    splitDone: (n: number) => `已分成 ${n} 張印。`,
    tooSmallToSplit: '紙張太小，無法分張印。',
    blurry: (names: string) => `「${names}」圖太小，印出來會糊。`,
    marginsTitle: '紙張邊界與間距',
    marginMm: '邊界（mm）',
    gapMm: '間距（mm）',
    downloadDoor: '下載整扇門的預覽圖',
    doorFile: '艙門預覽.png',
    doorFailed: '無法產生預覽圖。',
    noSheets: '回到門上加入圖片後，這裡會顯示排好的紙張。',
    sheetLabel: (n: number) => `第 ${n} 張`,
  },
}

export type Messages = typeof zhHant
