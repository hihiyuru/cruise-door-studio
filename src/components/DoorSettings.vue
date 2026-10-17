<script setup lang="ts">
import { computed } from 'vue'
import { useProject } from '../stores/project'
import { DOOR_OPTIONS, CUSTOM_DOOR_ID } from '../domain/doors'

/** Shown in the right column while no sticker is selected. */
const project = useProject()
const door = computed(() => project.door)
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
    aria-label="門的設定"
  >
    <h2 class="section-title">
      門
    </h2>

    <label class="flex flex-col gap-1">
      <span class="label">門款</span>
      <select
        class="input"
        :value="project.state.doorId"
        @change="setDoor(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="d in DOOR_OPTIONS"
          :key="d.id"
          :value="d.id"
        >{{ d.label }}</option>
      </select>
    </label>

    <div
      v-if="project.state.doorId === CUSTOM_DOOR_ID"
      class="grid grid-cols-2 gap-3"
    >
      <label class="flex flex-col gap-1"><span class="label">寬（mm）</span>
        <input
          class="input num"
          type="number"
          min="300"
          max="3000"
          :value="project.state.customDoor.w"
          @change="setCustomDoor('w', $event)"
        ></label>
      <label class="flex flex-col gap-1"><span class="label">高（mm）</span>
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
      <span class="label">門牌號碼（只影響預覽）</span>
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
        >標出不能貼的區域</label>
      <label class="flex items-center gap-2">
        <input
          v-model="project.state.view.grid"
          type="checkbox"
          @change="project.commit()"
        >10 公分格線</label>
    </div>

    <details class="text-[12.5px] text-muted">
      <summary class="cursor-pointer">
        尺寸依據
      </summary>
      <p class="mt-1.5">
        {{ door.w / 10 }} × {{ door.h / 10 }} cm。{{ door.note }}
      </p>
    </details>

    <p class="border-t border-line pt-3 text-[12.5px] text-muted">
      點貼紙就能調整大小、去背和白邊。
    </p>
  </section>
</template>
