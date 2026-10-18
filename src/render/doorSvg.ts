import type { DoorModel } from '../domain/doors'

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Inner SVG markup of a door in millimetre units (viewBox 0 0 door.w door.h). Uses only literal colours so it also renders as an image. */
export function doorSvg(door: DoorModel, opts: { keepOut: boolean; grid: boolean; roomNo: string }): string {
  // this markup goes through v-html; force numbers so a stray string can never become markup
  const w = Number(door.w) || 0
  const h = Number(door.h) || 0
  let s = `<defs>
    <linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#D2BC9C"/><stop offset=".5" stop-color="#DCC8AA"/><stop offset="1" stop-color="#D2BC9C"/></linearGradient>
    <pattern id="grain" width="40" height="${h}" patternUnits="userSpaceOnUse"><path d="M6 0V${h}M19 0V${h}M31 0V${h}" stroke="rgba(120,90,50,.07)" stroke-width="2"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#wood)"/><rect width="${w}" height="${h}" fill="url(#grain)"/>`
  if (opts.grid) {
    for (let x = 100; x < w; x += 100) s += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="rgba(20,34,58,.14)" stroke-width="1.5"/>`
    for (let y = 100; y < h; y += 100) s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(20,34,58,.14)" stroke-width="1.5"/>`
  }
  if (opts.keepOut) {
    for (const k of door.keepOut) {
      const style = 'fill="rgba(194,65,12,.13)" stroke="#C2410C" stroke-width="2" stroke-dasharray="10 8"'
      s += k.type === 'rect'
        ? `<rect x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="10" ${style}/>`
        : `<circle cx="${k.cx}" cy="${k.cy}" r="${k.r}" ${style}/>`
    }
  }
  if (door.fixtures) {
    s += `<circle cx="355" cy="257.5" r="102.5" fill="#7E5D3D"/><circle cx="355" cy="257.5" r="92" fill="none" stroke="#B89466" stroke-width="3"/>
    <text x="355" y="274" font-size="46" font-weight="700" text-anchor="middle" fill="#EAD9BC" font-family="Helvetica, Arial, sans-serif">${esc(opts.roomNo.slice(0, 6))}</text>
    <circle cx="355" cy="560" r="10" fill="#C4C7CC" stroke="#555" stroke-width="3"/><circle cx="355" cy="560" r="4" fill="#333"/>
    <rect x="598" y="790" width="84" height="55" rx="7" fill="#2E2E2E"/><rect x="610" y="802" width="22" height="8" rx="2" fill="#555"/>
    <circle cx="650" cy="959" r="30" fill="#C4C7CC" stroke="#8A8F96" stroke-width="2"/>
    <rect x="546" y="946" width="122" height="26" rx="13" fill="#D3D6DA" stroke="#8A8F96" stroke-width="2"/>
    <circle cx="630" cy="1058" r="18" fill="#C4C7CC" stroke="#8A8F96" stroke-width="2"/>`
  }
  return s
}

export const doorSvgDocument = (door: DoorModel, opts: { keepOut: boolean; grid: boolean; roomNo: string }, pxW: number, pxH: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Number(door.w) || 0} ${Number(door.h) || 0}" width="${Number(pxW) || 0}" height="${Number(pxH) || 0}">${doorSvg(door, opts)}</svg>`
