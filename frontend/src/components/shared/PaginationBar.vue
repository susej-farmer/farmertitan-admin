<template>
  <div v-if="totalItems > 0 || modelValue.page > 1" class="px-6 py-4 border-t border-gray-200 bg-gray-50">
    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <!-- Items per page selector -->
      <div class="flex items-center gap-3">
        <label :for="selectId" class="text-sm text-gray-700">Items per page:</label>
        <select
          :id="selectId"
          :name="selectId"
          :value="Number(modelValue.limit)"
          @change="handleLimitChange"
          class="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span class="text-sm text-gray-700">
          Showing {{ totalItems > 0 ? ((modelValue.page - 1) * modelValue.limit) + 1 : 0 }} to
          {{ Math.min(modelValue.page * modelValue.limit, totalItems) }}
          <span v-if="totalItems > 0">of {{ totalItems }} results</span>
        </span>
      </div>

      <!-- Page navigation -->
      <div class="flex items-center gap-2">
        <!-- First page -->
        <button
          @click="goToPage(1)"
          :disabled="modelValue.page === 1"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First page"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <!-- Previous -->
        <button
          @click="goToPage(modelValue.page - 1)"
          :disabled="modelValue.page === 1"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <!-- Page numbers -->
        <div class="hidden sm:flex items-center gap-1">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="typeof page === 'number' ? goToPage(page) : null"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              page === modelValue.page
                ? 'bg-emerald-600 text-white'
                : typeof page === 'number'
                ? 'border border-gray-300 hover:bg-gray-100'
                : 'cursor-default'
            ]"
            :disabled="typeof page !== 'number'"
          >
            {{ page }}
          </button>
        </div>

        <!-- Current page indicator (mobile) -->
        <div class="sm:hidden px-3 py-1.5 text-sm font-medium text-gray-700">
          Page {{ modelValue.page }} of {{ totalPages }}
        </div>

        <!-- Next -->
        <button
          @click="goToPage(modelValue.page + 1)"
          :disabled="modelValue.page >= totalPages"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>

        <!-- Last page -->
        <button
          @click="goToPage(totalPages)"
          :disabled="modelValue.page >= totalPages"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last page"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    validator: (value) => {
      return value.page !== undefined && value.limit !== undefined
    }
  },
  totalItems: {
    type: Number,
    default: 0
  },
  totalPages: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// Generate unique ID for accessibility
const selectId = `pagination-limit-${Math.random().toString(36).substr(2, 9)}`

// Computed
const visiblePages = computed(() => {
  const current = props.modelValue.page
  const total = Math.max(props.totalPages, 1)

  // Si solo hay una página, retornar array con esa página
  if (total === 1) return [1]

  const delta = 2 // Number of pages to show on each side of current page
  const range = []
  const rangeWithDots = []

  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    range.push(i)
  }

  if (current - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }

  rangeWithDots.push(...range)

  if (current + delta < total - 1) {
    rangeWithDots.push('...', total)
  } else if (total > 1) {
    rangeWithDots.push(total)
  }

  return rangeWithDots
})

// Methods
const goToPage = (page) => {
  if (page < 1 || page > props.totalPages || page === props.modelValue.page) {
    return
  }

  const newValue = {
    ...props.modelValue,
    page: Number(page)
  }

  emit('update:modelValue', newValue)
  emit('change', newValue)
}

const handleLimitChange = (event) => {
  const newLimit = Number(event.target.value)

  const newValue = {
    ...props.modelValue,
    page: 1, // Reset to first page when changing limit
    limit: newLimit
  }

  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>
