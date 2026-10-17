<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Sticker } from '../domain/types'
import { displayCanvas } from '../render/display'
import { assets, assetsVersion } from '../stores/assets'

/** Draws a sticker's finished look (border included) into its own canvas. */
const props = defineProps<{ sticker: Sticker }>()
const el = ref<HTMLCanvasElement>()

function draw() {
  const c = el.value
  const src = displayCanvas(props.sticker, assets.get(props.sticker.assetId)?.art)
  if (!c || !src) return
  c.width = src.width
  c.height = src.height
  c.getContext('2d')!.drawImage(src, 0, 0)
}

// while a sticker is being resized the browser scales the old canvas; redraw once it settles
let timer: ReturnType<typeof setTimeout> | undefined
const later = () => { clearTimeout(timer); timer = setTimeout(draw, 120) }

onMounted(draw)
watch(() => [props.sticker.assetId, props.sticker.border, props.sticker.cut, assetsVersion.value], draw)
watch(() => props.sticker.w, later)
</script>

<template>
  <canvas
    ref="el"
    class="block h-full w-full"
    aria-hidden="true"
  />
</template>
