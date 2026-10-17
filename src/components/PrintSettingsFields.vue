<script setup lang="ts">
import { usePrintSettings } from '../composables/usePrintSettings'
import { CUSTOM_PAPER_ID, PLACES } from '../domain/papers'

/** Where to print and on what paper. Shared by the print step and the top-bar picker. */
defineProps<{
  /** Smaller type and no section headings, for the top-bar picker. */
  compact?: boolean
}>()

const { pr, papers, place, isCustom, setPlace, setPaper, setCustom } = usePrintSettings()

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
      aria-label="在哪裡印"
    >
      <h2
        v-if="!compact"
        class="section-title"
      >
        在哪裡印
      </h2>
      <div class="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
        <button
          v-for="pl in PLACES"
          :key="pl.id"
          type="button"
          role="radio"
          :aria-checked="pr.place === pl.id"
          class="rounded py-1.5"
          :class="[
            compact ? 'px-1 text-[12.5px]' : 'px-2 text-[13px]',
            pr.place === pl.id ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-fg',
          ]"
          @click="setPlace(pl.id)"
        >
          {{ pl.label }}
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
      <span :class="compact ? 'label' : 'section-title'">紙張</span>
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
          {{ p.label }}
        </option>
        <option
          v-if="pr.place === 'shop'"
          :value="CUSTOM_PAPER_ID"
        >
          自訂尺寸…
        </option>
      </select>
    </label>

    <div
      v-if="isCustom"
      class="grid grid-cols-2 gap-3"
    >
      <label class="flex flex-col gap-1">
        <span class="label">寬（mm）</span>
        <input
          class="input num"
          type="number"
          :value="pr.custom.w"
          @change="onCustomChange('w', $event)"
        >
      </label>
      <label class="flex flex-col gap-1">
        <span class="label">高（mm）</span>
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
