import { ctx2d, type Canvas } from './canvas'

/**
 * Make pixels similar to each seed's colour transparent.
 * `tol` is 0–100; `global` removes every similar pixel, not only connected ones.
 * Returns whether anything changed.
 */
export function floodFill(c: Canvas, seeds: [number, number][], tol: number, global: boolean): boolean {
  const x = ctx2d(c, true)
  const W = c.width
  const H = c.height
  const im = x.getImageData(0, 0, W, H)
  const d = im.data
  const t2 = (tol * 4.42) ** 2
  let changed = false
  for (const [sx, sy] of seeds) {
    const i0 = (sy * W + sx) * 4
    if (d[i0 + 3] < 16) continue
    const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2]
    const near = (i: number) => {
      const a = d[i] - r0, b = d[i + 1] - g0, cc = d[i + 2] - b0
      return a * a + b * b + cc * cc <= t2
    }
    if (global) {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] >= 16 && near(i)) { d[i + 3] = 0; changed = true }
      }
      continue
    }
    const seen = new Uint8Array(W * H)
    const stack = [sy * W + sx]
    while (stack.length) {
      const p = stack.pop()!
      if (seen[p]) continue
      seen[p] = 1
      const i = p * 4
      if (d[i + 3] >= 16 && !near(i)) continue
      if (d[i + 3]) { d[i + 3] = 0; changed = true }
      const px = p % W
      if (px > 0) stack.push(p - 1)
      if (px < W - 1) stack.push(p + 1)
      if (p >= W) stack.push(p - W)
      if (p < W * H - W) stack.push(p + W)
    }
  }
  x.putImageData(im, 0, 0)
  return changed
}

/** Seeds every eighth of the way along all four edges, for automatic background removal. */
export function edgeSeeds(W: number, H: number): [number, number][] {
  const seeds: [number, number][] = []
  for (let k = 0; k <= 8; k++) {
    const fx = Math.round(((W - 1) * k) / 8)
    const fy = Math.round(((H - 1) * k) / 8)
    seeds.push([fx, 0], [fx, H - 1], [0, fy], [W - 1, fy])
  }
  return seeds
}

/** Remove a one-pixel rim around the artwork, which clears leftover light fringes. */
export function erode(c: Canvas) {
  const x = ctx2d(c, true)
  const W = c.width
  const H = c.height
  const im = x.getImageData(0, 0, W, H)
  const d = im.data
  const a = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) a[p] = d[p * 4 + 3]
  for (let y = 0; y < H; y++) {
    for (let xx = 0; xx < W; xx++) {
      const p = y * W + xx
      if (!a[p]) continue
      if (xx === 0 || y === 0 || xx === W - 1 || y === H - 1 || a[p - 1] < 16 || a[p + 1] < 16 || a[p - W] < 16 || a[p + W] < 16) {
        d[p * 4 + 3] = 0
      }
    }
  }
  x.putImageData(im, 0, 0)
}
