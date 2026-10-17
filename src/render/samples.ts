import { ctx2d, mk, type Canvas } from './canvas'

const FONT = 'system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
/** Drawn at 2.5× so the examples print sharply at their default size. */
const K = 2.5
function canvas(w: number, h: number): [Canvas, CanvasRenderingContext2D] {
  const c = mk(w * K, h * K)
  const x = ctx2d(c)
  x.scale(K, K)
  return [c, x]
}

/** Three simple example stickers drawn on canvas, so a first visit shows what the tool does. */
export function sampleArt(): { name: string; art: Canvas; w: number; x: number; y: number; rot: number }[] {
  const [badge, b] = canvas(600, 600)
  b.fillStyle = '#1F3A6B'
  b.beginPath(); b.arc(300, 300, 290, 0, Math.PI * 2); b.fill()
  b.strokeStyle = '#F2C14E'; b.lineWidth = 16
  b.beginPath(); b.arc(300, 300, 250, 0, Math.PI * 2); b.stroke()
  b.fillStyle = '#fff'; b.textAlign = 'center'
  b.font = `800 92px ${FONT}`
  b.fillText('BON', 300, 280); b.fillText('VOYAGE', 300, 380)

  const [star, s] = canvas(600, 580)
  s.fillStyle = '#F2C14E'
  s.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 125 : 290
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    s.lineTo(300 + r * Math.cos(a), 310 + r * Math.sin(a))
  }
  s.closePath(); s.fill()
  s.fillStyle = '#1F3A6B'; s.textAlign = 'center'; s.font = `800 70px ${FONT}`
  s.fillText('AHOY', 300, 335)

  const [flag, f] = canvas(700, 360)
  f.fillStyle = '#2E6FD8'
  f.beginPath(); f.moveTo(0, 0); f.lineTo(700, 120); f.lineTo(700, 240); f.lineTo(0, 360); f.closePath(); f.fill()
  f.fillStyle = '#fff'
  f.beginPath(); f.moveTo(0, 150); f.quadraticCurveTo(350, 110, 700, 175); f.lineTo(700, 195); f.quadraticCurveTo(350, 140, 0, 200); f.fill()

  return [
    { name: '範例：圓章', art: badge, w: 120, x: 365, y: 1350, rot: 0 },
    { name: '範例：星星', art: star, w: 110, x: 170, y: 700, rot: -12 },
    { name: '範例：旗子', art: flag, w: 130, x: 560, y: 140, rot: 8 },
  ]
}
