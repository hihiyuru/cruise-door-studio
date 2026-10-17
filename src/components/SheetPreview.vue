<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Placement } from '../domain/packing'
import { outer } from '../domain/geometry'
import { displayCanvas } from '../render/display'
import { cropTo, rot90 } from '../render/canvas'
import { assets, assetsVersion } from '../stores/assets'

const props = defineProps<{ sheet: Placement[]; paper: { w: number; h: number }; margin: number; index: number; label: string }>()
const el = ref<HTMLCanvasElement>()
const K = 1.2

function draw() {
  const c = el.value
  if (!c) return
  c.width = Math.round(props.paper.w * K)
  c.height = Math.round(props.paper.h * K)
  const x = c.getContext('2d')!
  x.fillStyle = '#fff'
  x.fillRect(0, 0, c.width, c.height)
  x.strokeStyle = 'rgba(36,87,197,.3)'
  x.setLineDash([3, 3])
  x.strokeRect(props.margin * K, props.margin * K, (props.paper.w - 2 * props.margin) * K, (props.paper.h - 2 * props.margin) * K)
  x.setLineDash([])
  for (const p of props.sheet) {
    let src = displayCanvas(p.sticker, assets.get(p.sticker.assetId)?.art)
    if (!src) continue
    if (p.crop) src = cropTo(src, p.crop, outer(p.sticker))
    if (p.rot) src = rot90(src)
    x.drawImage(src, p.x * K, p.y * K, p.pw * K, p.ph * K)
    if (p.tile) {
      const t = `${p.tile.label}-${p.tile.i}/${p.tile.n}`
      x.font = '600 12px system-ui, sans-serif'
      const tw = x.measureText(t).width
      x.fillStyle = 'rgba(36,87,197,.92)'
      x.fillRect(p.x * K + 3, p.y * K + 3, tw + 8, 16)
      x.fillStyle = '#fff'
      x.fillText(t, p.x * K + 7, p.y * K + 15)
    }
  }
}

onMounted(draw)
watch(() => [props.sheet, props.paper, props.margin, assetsVersion.value], draw, { deep: true })
</script>

<template>
  <figure class="m-0 flex flex-col gap-1">
    <canvas
      ref="el"
      class="h-auto w-full rounded-sm bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]"
      :aria-label="label"
      role="img"
    />
    <figcaption class="text-[12px] text-muted">
      {{ label }}
    </figcaption>
  </figure>
</template>
