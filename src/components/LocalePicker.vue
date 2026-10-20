<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ChevronDown, Languages } from 'lucide-vue-next'
import { useLocale } from '../stores/locale'
import { isLocale, LOCALE_NAMES, LOCALES } from '../i18n'

/**
 * Interface language. A native select so it works with a keyboard and opens the system picker on phones.
 * The label stays the same in every language, and each option is written in its own language, so someone
 * who landed on a language they can't read can still find theirs.
 */
const i18n = useLocale()
const { locale } = storeToRefs(i18n)

function onChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  if (isLocale(v)) i18n.setLocale(v)
}
</script>

<template>
  <div class="relative shrink-0">
    <select
      class="btn btn-quiet appearance-none !py-1 !pr-6 !pl-7 text-[13px] text-muted hover:text-fg"
      :value="locale"
      aria-label="語言 Language"
      @change="onChange"
    >
      <option
        v-for="l in LOCALES"
        :key="l"
        :value="l"
        :lang="l"
        class="bg-surface text-fg"
      >
        {{ LOCALE_NAMES[l] }}
      </option>
    </select>
    <Languages
      :size="15"
      class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted"
      aria-hidden="true"
    />
    <ChevronDown
      :size="13"
      class="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-muted"
      aria-hidden="true"
    />
  </div>
</template>
