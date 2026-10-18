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
 * Disney Adventure stateroom door. Size and number plate follow the approximate figures Disney Cruise Line
 * gives on planDisney: 71 × 195 cm, plate Ø20.5 cm with its top about 15.5 cm below the door top.
 * Disney publishes no positions for the peephole and lock, so those come from a measured diagram:
 * peephole 20 cm below the plate, lock area starting 79 cm from the top and 28 cm tall, against the right edge.
 */
export const ADVENTURE: DoorModel = {
  id: 'disney-adventure',
  name: '迪士尼郵輪・探險號（Disney Adventure）',
  w: 710,
  h: 1950,
  note: '約略尺寸，出發前建議自己量一次。門牌直徑 20.5 cm、門牌上緣距門頂約 15.5 cm、貓眼在門牌下 20 cm、門鎖區距門頂 79 cm。',
  fixtures: true,
  keepOut: [
    { name: '門牌', type: 'circle', cx: 355, cy: 257.5, r: 108 },
    { name: '貓眼', type: 'circle', cx: 355, cy: 560, r: 22 },
    { name: '門鎖和門把', type: 'rect', x: 525, y: 775, w: 185, h: 310 },
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
