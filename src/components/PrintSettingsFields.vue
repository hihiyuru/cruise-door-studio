<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePrintSettings } from '../composables/usePrintSettings'
import { CUSTOM_PAPER_ID, PLACES } from '../domain/papers'
import { useLocale } from '../stores/locale'

/** Where to print and on what paper. Shared by the print step and the top-bar picker. */
defineProps<{
  /** Smaller type and no section headings, for the top-bar picker. */
  compact?: boolean
}>()

const { pr, papers, place, paperOption, isCustom, setPlace, setPaper, setCustom } = usePrintSettings()
const { m } = storeToRefs(useLocale())

function onPaperChange(e: Event) {
  setPaper((e.target as HTMLSelectElement).value)
}
function onCustomChange(key: 'w' | 'h', e: Event) {
  setCustom(key, (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div
    class="flex flex-col"
    :class="compact ? 'gap-3' : 'gap-5'"
  >
    <div
      class="flex flex-col gap-2"
      role="radiogroup"
      :aria-label="m.printSettings.where"
    >
      <h2
        v-if="!compact"
        class="section-title"
      >
        {{ m.printSettings.where }}
      </h2>
      <div class="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
        <button
          v-for="pl in PLACES"
          :key="pl"
          type="button"
          role="radio"
          :aria-checked="pr.place === pl"
          class="rounded py-1.5"
          :class="[
            compact ? 'px-1 text-[12.5px]' : 'px-2 text-[13px]',
            pr.place === pl ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-fg',
          ]"
          @click="setPlace(pl)"
        >
          {{ m.places[pl].label }}
        </button>
      </div>
      <p
        v-if="!compact"
        class="text-[12.5px] text-muted"
      >
        {{ place.hint }}
      </p>
    </div>

    <label class="flex flex-col gap-1.5">
      <span :class="compact ? 'label' : 'section-title'">{{ m.printSettings.paper }}</span>
      <select
        class="input"
        :value="pr.paperId"
        @change="onPaperChange"
      >
        <option
          v-for="p in papers"
          :key="p.id"
          :value="p.id"
        >
          {{ paperOption(p) }}
        </option>
        <option
          v-if="pr.place === 'shop'"
          :value="CUSTOM_PAPER_ID"
        >
          {{ m.paper.customOption }}
        </option>
      </select>
    </label>

    <div
      v-if="isCustom"
      class="grid grid-cols-2 gap-3"
    >
      <label class="flex flex-col gap-1">
        <span class="label">{{ m.printSettings.widthMm }}</span>
        <input
          class="input num"
          type="number"
          :value="pr.custom.w"
          @change="onCustomChange('w', $event)"
        >
      </label>
      <label class="flex flex-col gap-1">
        <span class="label">{{ m.printSettings.heightMm }}</span>
        <input
          class="input num"
          type="number"
          :value="pr.custom.h"
          @change="onCustomChange('h', $event)"
        >
      </label>
    </div>
  </div>
</template>
