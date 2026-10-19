<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { TriangleAlert } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useBackup } from '../composables/useBackup'
import { useLocale } from '../stores/locale'

/** Saving problems can cost the whole layout, so they stay on screen instead of in a toast. */
const project = useProject()
const backup = useBackup()
const { m } = storeToRefs(useLocale())
const reload = () => location.reload()
</script>

<template>
  <div
    v-if="project.saveStatus === 'error' || project.saveStatus === 'conflict'"
    class="mx-auto mt-3 flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-warn bg-warn-bg px-3 py-2 text-[13.5px] text-warn"
    role="alert"
  >
    <TriangleAlert
      :size="16"
      class="shrink-0"
      aria-hidden="true"
    />
    <template v-if="project.saveStatus === 'error'">
      <span class="mr-auto">{{ m.saveBanner.failed }}</span>
      <button
        type="button"
        class="btn"
        @click="backup"
      >
        {{ m.topBar.downloadBackup }}
      </button>
    </template>
    <template v-else>
      <span class="mr-auto">{{ m.saveBanner.conflict }}</span>
      <button
        type="button"
        class="btn"
        @click="reload"
      >
        {{ m.saveBanner.reload }}
      </button>
      <button
        type="button"
        class="btn"
        @click="project.keepThisTab()"
      >
        {{ m.saveBanner.keepThisTab }}
      </button>
    </template>
  </div>
</template>
