import type { KeepOut } from './types'

export interface DoorModel {
  id: string
  w: number
  h: number
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
  w: 710,
  h: 1950,
  fixtures: true,
  keepOut: [
    { id: 'roomNumber', type: 'circle', cx: 355, cy: 257.5, r: 108 },
    { id: 'peephole', type: 'circle', cx: 355, cy: 560, r: 22 },
    { id: 'lock', type: 'rect', x: 525, y: 775, w: 185, h: 310 },
  ],
}

export const CUSTOM_DOOR_ID = 'custom'

export function doorFor(id: string, custom: { w: number; h: number }): DoorModel {
  if (id === ADVENTURE.id) return ADVENTURE
  return {
    id: CUSTOM_DOOR_ID,
    w: custom.w,
    h: custom.h,
    fixtures: false,
    keepOut: [],
  }
}

export const DOOR_OPTIONS = [ADVENTURE.id, CUSTOM_DOOR_ID]
