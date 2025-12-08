<template>
  <div class="relative" ref="autocompleteRef">
    <!-- Input with Search Icon and Clear Button -->
    <div class="relative">
      <!-- Search Icon -->
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>

      <!-- Input Field -->
      <input
        ref="inputRef"
        v-model="searchQuery"
        @input="handleInput"
        @focus="handleFocus"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.esc="closeDropdown"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="form-input pl-10 pr-10"
        :class="{ 'bg-gray-100': disabled }"
      />

      <!-- Clear Button (X) -->
      <button
        v-if="searchQuery && !disabled"
        @click="clearSelection"
        type="button"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Loading Spinner -->
      <div
        v-if="loading"
        class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
      >
        <div class="loading-spinner w-4 h-4 border-2"></div>
      </div>
    </div>

    <!-- Dropdown Results -->
    <div
      v-if="showDropdown && (filteredOptions.length > 0 || loading || (!loading && searchQuery))"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
    >
      <!-- Loading State -->
      <div v-if="loading" class="px-4 py-3 text-sm text-gray-500 text-center">
        <div class="loading-spinner w-5 h-5 mx-auto mb-2 border-2"></div>
        Loading...
      </div>

      <!-- No Results -->
      <div v-else-if="!loading && filteredOptions.length === 0 && searchQuery" class="px-4 py-3 text-sm text-gray-500 text-center">
        No results found
      </div>

      <!-- Results List -->
      <ul v-else class="py-1">
        <li
          v-for="(option, index) in filteredOptions"
          :key="getOptionValue(option)"
          @click="selectOption(option)"
          @mouseenter="highlightedIndex = index"
          :class="[
            'px-4 py-2 cursor-pointer text-sm transition-colors',
            highlightedIndex === index ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900 hover:bg-gray-50'
          ]"
        >
          <span v-html="highlightMatch(getOptionLabel(option))"></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  fetchOptions: {
    type: Function,
    required: true
  },
  labelKey: {
    type: String,
    default: 'name'
  },
  valueKey: {
    type: String,
    default: 'id'
  },
  placeholder: {
    type: String,
    default: 'Search...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  minChars: {
    type: Number,
    default: 0
  },
  debounce: {
    type: Number,
    default: 300
  },
  initialLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'select'])

// Refs
const autocompleteRef = ref(null)
const inputRef = ref(null)
const searchQuery = ref(props.initialLabel || '')
const filteredOptions = ref([])
const loading = ref(false)
const showDropdown = ref(false)
const highlightedIndex = ref(0)
let debounceTimer = null

// Methods
const getOptionLabel = (option) => {
  return typeof option === 'object' ? option[props.labelKey] : option
}

const getOptionValue = (option) => {
  return typeof option === 'object' ? option[props.valueKey] : option
}

const handleInput = () => {
  showDropdown.value = true
  highlightedIndex.value = 0

  // Clear debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Only search if meets minimum characters
  if (searchQuery.value.length < props.minChars) {
    filteredOptions.value = []
    return
  }

  // Debounce the search
  debounceTimer = setTimeout(async () => {
    await fetchResults()
  }, props.debounce)
}

const fetchResults = async () => {
  loading.value = true
  try {
    const results = await props.fetchOptions(searchQuery.value)
    filteredOptions.value = results || []
  } catch (error) {
    console.error('Error fetching autocomplete options:', error)
    filteredOptions.value = []
  } finally {
    loading.value = false
  }
}

const handleFocus = async () => {
  showDropdown.value = true
  // If no search query, load initial results
  if (!searchQuery.value || searchQuery.value.length >= props.minChars) {
    await fetchResults()
  }
}

const selectOption = (option) => {
  const value = getOptionValue(option)
  const label = getOptionLabel(option)

  searchQuery.value = label
  emit('update:modelValue', value)
  emit('change', value)
  emit('select', option)

  closeDropdown()
}

const clearSelection = () => {
  searchQuery.value = ''
  filteredOptions.value = []
  emit('update:modelValue', '')
  emit('change', '')
  emit('select', null)
  showDropdown.value = false
}

const closeDropdown = () => {
  showDropdown.value = false
  highlightedIndex.value = 0
}

const navigateDown = () => {
  if (highlightedIndex.value < filteredOptions.value.length - 1) {
    highlightedIndex.value++
  }
}

const navigateUp = () => {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
  }
}

const selectHighlighted = () => {
  if (filteredOptions.value[highlightedIndex.value]) {
    selectOption(filteredOptions.value[highlightedIndex.value])
  }
}

const highlightMatch = (text) => {
  if (!searchQuery.value) return text

  const regex = new RegExp(`(${searchQuery.value})`, 'gi')
  return text.replace(regex, '<strong class="font-semibold text-emerald-600">$1</strong>')
}

// Click outside handler
const handleClickOutside = (event) => {
  if (autocompleteRef.value && !autocompleteRef.value.contains(event.target)) {
    closeDropdown()
  }
}

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    searchQuery.value = ''
  }
})

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>
