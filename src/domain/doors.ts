import type { KeepOut } from './types'

export interface DoorModel {
  id: string
  name: string
  w: number
  h: number
  /** Short measurement notes shown under the door. */
  note: string
  keepOut: KeepOut[]
  /** Whether the room-number plate and lock hardware are drawn. */
  fixtures: boolean
}

/**
 * Measurements of a Disney Adventure stateroom door, from a published diagram:
 * 73 × 197 cm, number plate Ø20.5 cm with its top 15.7 cm below the door top,
 * peephole 20 cm below the plate, lock area starting 79 cm from the top and 28 cm tall.
 */
export const ADVENTURE: DoorModel = {
  id: 'disney-adventure',
  name: '迪士尼郵輪・探險號（Disney Adventure）',
  w: 730,
  h: 1970,
  note: '門牌直徑 20.5 cm、門牌上緣距門頂 15.7 cm、貓眼在門牌下 20 cm、門鎖區距門頂 79 cm。',
  fixtures: true,
  keepOut: [
    { name: '門牌', type: 'circle', cx: 365, cy: 259.5, r: 108 },
    { name: '貓眼', type: 'circle', cx: 365, cy: 562, r: 22 },
    { name: '門鎖和門把', type: 'rect', x: 545, y: 775, w: 185, h: 310 },
  ],
}

export const CUSTOM_DOOR_ID = 'custom'

export function doorFor(id: string, custom: { w: number; h: number }): DoorModel {
  if (id === ADVENTURE.id) return ADVENTURE
  return {
    id: CUSTOM_DOOR_ID,
    name: '自訂尺寸',
    w: custom.w,
    h: custom.h,
    note: '自訂尺寸的門不會畫出門牌、門鎖，也沒有禁貼區。',
    fixtures: false,
    keepOut: [],
  }
}

export const DOOR_OPTIONS = [
  { id: ADVENTURE.id, label: ADVENTURE.name },
  { id: CUSTOM_DOOR_ID, label: '自訂尺寸…' },
]
