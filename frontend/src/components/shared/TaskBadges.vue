<template>
  <div class="task-badges-container">
    <!-- Compact badges with tooltip -->
    <div
      class="badge-group"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
    >
      <span class="badge bg-success-100 text-success-700 font-semibold">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8"/>
        </svg>
        {{ totalOpen }}
      </span>
      <span class="text-gray-400 mx-1">|</span>
      <span class="badge bg-gray-100 text-gray-700 font-semibold">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8"/>
        </svg>
        {{ totalClosed }}
      </span>
    </div>

    <!-- Tooltip (quick view on hover) -->
    <Transition name="tooltip-fade">
      <div v-if="showTooltip && hasDetails" class="task-tooltip">
        <div class="tooltip-content">
          <div class="tooltip-header">Task Summary</div>
          <div class="tooltip-body">
            <div v-for="task in openTasks" :key="task.type" class="tooltip-row">
              <span class="task-type-label">{{ formatTaskType(task.type) }}:</span>
              <span class="task-counts">
                <span class="text-success-700 font-medium">{{ task.quantity }} open</span>
                <span class="text-gray-400 mx-1">/</span>
                <span class="text-gray-600">{{ getClosedCount(task.type) }} closed</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  openTasks: {
    type: Array,
    default: () => [],
    validator: (value) => {
      return value.every(task =>
        typeof task === 'object' &&
        'type' in task &&
        'quantity' in task
      )
    }
  },
  closedTasks: {
    type: Array,
    default: () => [],
    validator: (value) => {
      return value.every(task =>
        typeof task === 'object' &&
        'type' in task &&
        'quantity' in task
      )
    }
  }
})

// State
const showTooltip = ref(false)

// Computed
const totalOpen = computed(() => {
  return props.openTasks.reduce((sum, task) => sum + task.quantity, 0)
})

const totalClosed = computed(() => {
  return props.closedTasks.reduce((sum, task) => sum + task.quantity, 0)
})

const hasDetails = computed(() => {
  return props.openTasks.length > 0 || props.closedTasks.length > 0
})

// Methods
const getClosedCount = (type) => {
  const closedTask = props.closedTasks.find(task => task.type === type)
  return closedTask ? closedTask.quantity : 0
}

const formatTaskType = (type) => {
  // Capitalize first letter and format common types
  const formatted = type.charAt(0).toUpperCase() + type.slice(1)
  return formatted.replace(/_/g, ' ')
}
</script>

<style scoped>
.task-badges-container {
  position: relative;
  display: inline-block;
}

.badge-group {
  display: flex;
  align-items: center;
  cursor: default;
  transition: all 0.2s ease;
}

.badge-group:hover {
  transform: scale(1.05);
}

/* Tooltip Styles */
.task-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  z-index: 50;
  min-width: 240px;
}

.tooltip-content {
  @apply bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden;
}

.tooltip-header {
  @apply px-3 py-2 text-xs font-semibold bg-gray-800 border-b border-gray-700;
}

.tooltip-body {
  @apply px-3 py-2 space-y-2;
}

.tooltip-row {
  @apply flex justify-between items-center text-xs;
}

.task-type-label {
  @apply font-medium text-gray-300;
}

.task-counts {
  @apply flex items-center;
}

/* Transitions */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
