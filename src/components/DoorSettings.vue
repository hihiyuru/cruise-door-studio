<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useProject } from '../stores/project'
import { DOOR_OPTIONS, CUSTOM_DOOR_ID } from '../domain/doors'
import { useLocale } from '../stores/locale'

/** Shown in the right column while no sticker is selected. */
const project = useProject()
const { m } = storeToRefs(useLocale())
const door = computed(() => project.door)
/** The custom door's option reads 「自訂尺寸…」 since choosing it opens the size fields. */
const doorOption = (id: string) => (id === CUSTOM_DOOR_ID ? m.value.door.customOption : m.value.door.names[id])
const clampDoor = (v: string) => Math.max(300, Math.min(3000, Math.round(+v || 0)))

function setCustomDoor(key: 'w' | 'h', e: Event) {
  project.state.customDoor[key] = clampDoor((e.target as HTMLInputElement).value)
  project.commit()
}
function setRoomNo(e: Event) {
  project.state.roomNo = (e.target as HTMLInputElement).value
  project.commit()
}

function setDoor(id: string) {
  project.state.doorId = id
  project.commit()
}
</script>

<template>
  <section
    class="flex min-w-0 flex-col gap-4"
    :aria-label="m.door.region"
  >
    <h2 class="section-title">
      {{ m.door.title }}
    </h2>

    <label class="flex flex-col gap-1">
      <span class="label">{{ m.door.model }}</span>
      <select
        class="input"
        :value="project.state.doorId"
        @change="setDoor(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="d in DOOR_OPTIONS"
          :key="d"
          :value="d"
        >{{ doorOption(d) }}</option>
      </select>
    </label>

    <div
      v-if="project.state.doorId === CUSTOM_DOOR_ID"
      class="grid grid-cols-2 gap-3"
    >
      <label class="flex flex-col gap-1"><span class="label">{{ m.door.widthMm }}</span>
        <input
          class="input num"
          type="number"
          min="300"
          max="3000"
          :value="project.state.customDoor.w"
          @change="setCustomDoor('w', $event)"
        ></label>
      <label class="flex flex-col gap-1"><span class="label">{{ m.door.heightMm }}</span>
        <input
          class="input num"
          type="number"
          min="300"
          max="3000"
          :value="project.state.customDoor.h"
          @change="setCustomDoor('h', $event)"
        ></label>
    </div>

    <label
      v-if="door.fixtures"
      class="flex flex-col gap-1"
    >
      <span class="label">{{ m.door.roomNo }}</span>
      <input
        class="input num"
        maxlength="6"
        :value="project.state.roomNo"
        @change="setRoomNo"
      >
    </label>

    <div class="flex flex-col gap-2 text-[13px]">
      <label
        v-if="door.keepOut.length"
        class="flex items-center gap-2"
      >
        <input
          v-model="project.state.view.keepOut"
          type="checkbox"
          @change="project.commit()"
        >{{ m.door.showKeepOut }}</label>
      <label class="flex items-center gap-2">
        <input
          v-model="project.state.view.grid"
          type="checkbox"
          @change="project.commit()"
        >{{ m.door.grid }}</label>
    </div>

    <details class="text-[12.5px] text-muted">
      <summary class="cursor-pointer">
        {{ m.door.basis }}
      </summary>
      <p class="mt-1.5">
        {{ m.door.size(door.w / 10, door.h / 10) }}{{ m.door.notes[door.id] }}
      </p>
    </details>

    <p class="border-t border-line pt-3 text-[12.5px] text-muted">
      {{ m.door.hint }}
    </p>
  </section>
</template>
