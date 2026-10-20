import type { Paper } from '../../domain/papers'
import { standardPaperName } from '../../domain/papers'
import type { PrintPlace } from '../../domain/types'
import type { Messages } from './zhHant'

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** English. Sentence case, no "please"; failures start with "Can't", successes are a short past-tense line. */
export const en: Messages = {
  timeTag: 'en',
  list: (items: string[]) => items.join(', '),

  app: {
    title: 'Cruise Door Studio',
    loading: 'Loading your last layout…',
    footer: 'Not an official Disney tool · Pictures stay in this browser and are never uploaded · Cabin doors are metal, so decorations hang with magnets',
    nothingToRedo: 'Nothing to redo.',
    nothingToUndo: 'Nothing to undo.',
    lostPictures: (n: number) => `Can't find ${n} ${plural(n, 'picture', 'pictures')}. Removed from the door.`,
  },

  topBar: {
    back: 'Back to the door',
    saving: 'Saving…',
    saveFailed: "Can't save automatically",
    savePaused: 'Saving paused',
    saved: 'Saved',
    savedAt: (time: string) => `Saved ${time}`,
    undo: 'Undo',
    undoTitle: 'Undo (⌘Z)',
    redo: 'Redo',
    redoTitle: 'Redo (⇧⌘Z)',
    backup: 'Backup',
    downloadBackup: 'Download backup',
    downloadBackupHint: 'Layout and pictures in one file, to carry on on another computer',
    openBackup: 'Open backup',
    openBackupHint: 'Replaces the current layout. You can undo it',
    print: 'Print / download PDF',
    sheetCount: (n: number) => ` (${n} ${plural(n, 'sheet', 'sheets')})`,
  },

  backup: {
    fileName: (stamp: string) => `cruise-door-project-${stamp}.json`,
    downloaded: 'Backup downloaded. On another computer, use "Open backup" to carry on.',
    downloadFailed: "Out of memory, can't download the backup. Delete a few large pictures and try again.",
    opened: 'Backup opened.',
    openedWithLost: (n: number) => `Backup opened, but ${n} ${plural(n, 'picture is', 'pictures are')} missing and removed from the door.`,
    notBackup: "Can't open this. It isn't a backup file.",
    openFailed: "Can't open this. The file may be damaged.",
  },

  saveBanner: {
    failed: "Can't save automatically. Download a backup before closing.",
    conflict: 'Another tab changed the layout, so changes here are no longer saved.',
    reload: 'Load latest',
    keepThisTab: 'Keep this version',
  },

  toast: {
    undo: 'Undo',
    close: 'Close',
  },

  samples: {
    badge: 'Example: badge',
    star: 'Example: star',
    flag: 'Example: flag',
  },

  stickers: {
    region: 'Sticker list',
    add: 'Add pictures',
    addHint: 'PNG, JPG, SVG. You can also drag them in or paste.',
    title: 'Stickers',
    clearSamples: 'Remove examples',
    samplesCleared: 'Examples removed.',
    // followed directly by the "bring back" button
    empty: 'No stickers on the door yet. ',
    restoreSamples: 'Bring back the examples',
    width: (cm: string) => `${cm} cm wide`,
    covers: (zones: string) => `Covers the ${zones}`,
    clearAll: 'Remove all stickers',
    confirmClearAll: (n: number) => `Click again to delete all ${n}`,
    cleared: (n: number) => `Removed ${n} ${plural(n, 'sticker', 'stickers')}.`,
    pastedName: 'Pasted picture',
    added: (n: number) => (n > 1 ? `Added ${n} pictures.` : 'Added.'),
    cannotOpen: (names: string) => `Can't open ${names}. Use JPG or PNG instead.`,
    deleted: (name: string) => `Deleted "${name}".`,
  },

  door: {
    region: 'Door settings',
    stage: 'Cabin door',
    title: 'Door',
    model: 'Door',
    names: {
      'disney-adventure': 'Disney Cruise Line · Disney Adventure',
      custom: 'Custom size',
    },
    customOption: 'Custom size…',
    notes: {
      'disney-adventure': 'Approximate. Measure your own door before you sail. Number plate 20.5 cm across, its top about 15.5 cm below the top of the door; peephole 20 cm below the plate; lock area starts 79 cm from the top.',
      custom: 'A custom door has no number plate or lock drawn, and no areas to keep clear.',
    },
    widthMm: 'Width (mm)',
    heightMm: 'Height (mm)',
    roomNo: 'Room number (preview only)',
    showKeepOut: 'Show where not to stick',
    grid: '10 cm grid',
    basis: 'Where these sizes come from',
    size: (w: number, h: number) => `${w} × ${h} cm. `,
    hint: 'Click a sticker to change its size, background and border.',
    zones: {
      roomNumber: 'number plate',
      peephole: 'peephole',
      lock: 'lock and handle',
      outside: 'edge of the door',
    },
    zonesShort: {
      roomNumber: 'number plate',
      peephole: 'peephole',
      lock: 'handle',
      outside: 'edge of the door',
    },
  },

  sticker: {
    accessibleName: (name: string, cm: string) => `${name}, ${cm} cm wide`,
    accessibleCovers: (zones: string) => `, covers the ${zones}`,
    resize: 'Drag to resize',
    rotate: 'Drag to rotate',
  },

  toolbar: {
    region: 'Sticker tools',
    removeBackground: 'Remove background',
    duplicate: 'Duplicate',
    duplicateTitle: 'Make a copy',
    delete: 'Delete',
    deleteTitle: 'Delete (Delete key)',
  },

  inspector: {
    region: 'Sticker settings',
    name: 'Name',
    renameTitle: 'Click to rename',
    deselect: 'Deselect',
    width: 'Width',
    finished: (w: string, h: string) => `Finished ${w} × ${h}`,
    rotation: 'Rotation',
    straighten: 'Straighten',
    border: 'Border',
    cutLine: 'Add a grey cutting line',
    inTheWay: (zone: string) => `It's covering the ${zone}. Move it a little.`,
    offDoor: 'It goes past the edge of the door.',
    blurry: 'The picture is too small and will print blurry.',
    fitsOne: (paper: string) => `Fits on one ${paper} sheet.`,
    willSplit: (paper: string, n: number) => `Too big for ${paper}. It will print on ${n} sheets.`,
    doesNotFit: (paper: string) => `Too big for ${paper}.`,
    changePrintTitle: 'Change where to print or the paper',
    shrinkTo: (cm: string) => `Shrink to ${cm} cm`,
    tile: 'Print on several sheets and join them',
    tooSmallToSplit: "The paper is too small to split onto.",
    removeBackground: 'Remove background',
    replace: 'Replace picture',
    replaced: 'Picture replaced.',
    duplicate: 'Duplicate',
    mirror: 'Mirror copy',
    mirrorTitle: 'Copy to the mirrored spot on the other side of the door',
    toTop: 'Bring to front',
    toBottom: 'Send to back',
    delete: 'Delete',
  },

  editor: {
    canvas: 'Click a background colour to remove it',
    title: 'Remove background',
    hint: 'Click the background. Areas of the same colour go together.',
    auto: 'Remove automatically',
    range: 'Range',
    global: 'Also remove the same colour elsewhere',
    shave: 'Trim edges',
    undo: 'Step back',
    reset: 'Back to original',
    busyPhotoBefore: 'For photos with busy backgrounds, try',
    busyPhotoAfter: 'first.',
    cancel: 'Cancel',
    apply: 'Apply',
    nothingHere: 'No background left here.',
    alreadyClean: 'The background is already clean.',
    nothingToUndo: 'Nothing to step back to.',
    notApplied: 'Not applied yet. Choose Apply to keep it, or Cancel to discard.',
    allRemoved: 'Everything was removed. Choose Step back.',
    applied: 'Background removed.',
    applyFailed: "Out of memory, can't remove the background.",
  },

  places: {
    ibon: { label: '7-11 ibon', hint: 'Plain paper, about NT$20 per colour A3 sheet.' },
    shop: { label: 'Print shop', hint: 'Photo paper and large sizes available.' },
    home: { label: 'Home printer', hint: 'Mostly A4.' },
  } satisfies Record<PrintPlace, { label: string; hint: string }>,

  paper: {
    name: (p: Paper) => (p.id === 'custom' ? `${p.w} × ${p.h} mm` : p.id === 'a3plus' ? 'A3+' : standardPaperName(p)),
    option: (p: Paper, place: PrintPlace) => {
      if (p.id === 'custom') return `Custom (${p.w} × ${p.h} mm)`
      const name = p.id === 'a3plus' ? 'A3+' : standardPaperName(p)
      return place === 'ibon' ? name : `${name} (${p.w / 10} × ${p.h / 10} cm)`
    },
    fileName: (p: Paper, place: PrintPlace) => {
      if (p.id === 'custom') return `${p.w}x${p.h}mm`
      const base = p.id === 'a3plus' ? 'A3plus' : standardPaperName(p).toUpperCase()
      return place === 'ibon' ? `ibon-${base}` : base
    },
    customOption: 'Custom size…',
  },

  printSettings: {
    where: 'Where to print',
    paper: 'Paper',
    widthMm: 'Width (mm)',
    heightMm: 'Height (mm)',
    pickerTitle: 'Where to print and paper',
    printAt: 'Print at',
    summary: (place: string, paper: string) => `${place} · ${paper}`,
  },

  print: {
    region: 'Print settings',
    previewRegion: 'Sheet previews',
    totalBefore: 'Total:',
    totalSheets: (paper: string, n: number) => `${plural(n, 'sheet', 'sheets')} of ${paper}`,
    costBefore: ' · about NT$',
    costAfter: '',
    empty: 'No stickers on the door yet.',
    download: 'Download PDF',
    preparing: 'Preparing…',
    progress: (done: number, total: number) => `Making sheet ${done} of ${total}…`,
    fileBase: (paper: string, n: number) => `door-stickers_${paper}_${n}-${plural(n, 'sheet', 'sheets')}`,
    partFile: (base: string, from: number, to: number) => `${base}_sheets-${from}-${to}.pdf`,
    partLabel: (from: number, to: number) => `Sheets ${from}–${to}`,
    downloaded: 'PDF downloaded.',
    splitFiles: (n: number) => `The file is large, so it's split into ${n} PDFs.`,
    missingArtwork: (name: string) => `Can't find the picture for "${name}", so the PDF can't be made. Replace or delete it and try again.`,
    outOfMemory: "Out of memory, can't make the PDF. Shrink the largest stickers first.",
    partsHint: 'Download each one, and upload each one at the ibon too.',
    partDone: 'Downloaded',
    ibonTip: 'Print one sheet first and check the scale bar measures 5 cm.',
    shopTip: 'Print at actual size. If CMYK is needed, ask the shop to convert it.',
    homeTip: 'When printing, choose "Actual size", not "Fit to page".',
    tiled: (name: string, n: number, label: string) => `"${name}" prints on ${n} sheets (${label}-1 to ${label}-${n}). Overlap them by 1 cm to line up.`,
    tooBig: (paper: string) => `These don't fit on ${paper}:`,
    shrinkTo: (cm: string) => `Shrink to ${cm} cm`,
    split: 'Split across sheets',
    shrunk: (cm: string) => `Shrunk to ${cm} cm.`,
    splitDone: (n: number) => `Split onto ${n} sheets.`,
    tooSmallToSplit: "The paper is too small to split onto.",
    blurry: (names: string) => `Too small, will print blurry: ${names}.`,
    marginsTitle: 'Margins and spacing',
    marginMm: 'Margin (mm)',
    gapMm: 'Spacing (mm)',
    downloadDoor: 'Download a preview of the whole door',
    doorFile: 'door-preview.png',
    doorFailed: "Can't make the preview image.",
    noSheets: 'Add pictures on the door and the arranged sheets will show here.',
    sheetLabel: (n: number) => `Sheet ${n}`,
  },
}
