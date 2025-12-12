<template>
  <Transition name="slide-down">
    <div
      v-if="showBanner"
      :class="['environment-banner', currentEnvironment?.bannerClass]"
    >
      <div class="container mx-auto px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-lg">{{ currentEnvironment?.icon }}</span>
          <div>
            <p class="font-bold text-sm uppercase tracking-wide">
              {{ currentEnvironment?.displayName }} Environment
            </p>
            <p class="text-xs opacity-90">
              {{ currentEnvironment?.description }}
            </p>
          </div>
        </div>

        <!-- Optional: Environment switcher (for development/testing only) -->
        <div v-if="showSwitcher" class="flex items-center gap-2">
          <select
            :value="environmentId"
            @change="handleEnvironmentChange"
            class="text-xs px-2 py-1 rounded border border-white border-opacity-30 bg-white bg-opacity-20 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
          >
            <option
              v-for="env in Object.values(ENVIRONMENTS)"
              :key="env.id"
              :value="env.id"
              class="text-gray-900"
            >
              {{ env.icon }} {{ env.name }}
            </option>
          </select>
          <span class="text-xs opacity-75">Quick Switch</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useEnvironment } from '@/composables/useEnvironment'
import { useRouter } from 'vue-router'

const props = defineProps({
  showSwitcher: {
    type: Boolean,
    default: false // Set to true to enable quick environment switching (dev only)
  }
})

const router = useRouter()
const {
  currentEnvironment,
  environmentId,
  showBanner,
  setEnvironment,
  ENVIRONMENTS
} = useEnvironment()

const handleEnvironmentChange = (event) => {
  const newEnv = event.target.value
  if (confirm(`Switch to ${ENVIRONMENTS[newEnv.toUpperCase()].displayName} environment? You will need to re-login.`)) {
    setEnvironment(newEnv)
    // Optionally logout and redirect to login
    router.push('/login')
  } else {
    // Reset select to current value
    event.target.value = environmentId.value
  }
}
</script>

<style scoped>
.environment-banner {
  @apply w-full shadow-md z-40;
  position: sticky;
  top: 0;
}

/* Slide down animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
