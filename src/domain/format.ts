/** 125 → "12.5", 120 → "12": millimetres shown as centimetres without a trailing ".0". */
export const formatCm = (mm: number) => (mm / 10).toFixed(1).replace(/\.0$/, '')

/** "IMG_2041.HEIC" → "IMG_2041"; names without an extension are kept as they are. */
export const fileBaseName = (name: string) => name.replace(/\.[^.]+$/, '')

/** Random id for stickers, pictures and tabs. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 12)
