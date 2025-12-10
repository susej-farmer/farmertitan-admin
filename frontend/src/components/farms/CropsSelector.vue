<template>
  <div class="space-y-3">
    <!-- Selected Crops Display -->
    <div v-if="selectedCrops.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="(crop, index) in selectedCrops"
        :key="index"
        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
        :class="getCategoryColor(crop.category)"
      >
        <span>{{ crop.label }}</span>
        <button
          type="button"
          @click="removeCrop(index)"
          class="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Add Crop Section -->
    <div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <div class="space-y-3">
        <!-- Category Select -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select
            v-model="newCrop.category"
            class="form-select w-full text-sm"
          >
            <option value="">Select category...</option>
            <option value="row">Row Crops</option>
            <option value="specialty">Specialty</option>
            <option value="tree">Tree Crops</option>
            <option value="vegetable">Vegetables</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Crop Type Input -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Crop Type</label>
          <input
            v-model="newCrop.label"
            type="text"
            placeholder="e.g., Corn, Wine Grapes, Almonds"
            class="form-input w-full text-sm"
            @keydown.enter.prevent="addCrop"
          />
        </div>

        <!-- Add Button -->
        <button
          type="button"
          @click="addCrop"
          :disabled="!canAddCrop"
          class="btn btn-sm btn-secondary w-full"
          :class="{ 'opacity-50 cursor-not-allowed': !canAddCrop }"
        >
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Crop
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="selectedCrops.length === 0" class="text-center py-4 text-sm text-gray-500">
      No crops added yet. Add crops using the form above.
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// State
const selectedCrops = ref([...props.modelValue])
const newCrop = ref({
  label: '',
  category: ''
})

// Computed
const canAddCrop = computed(() => {
  return newCrop.value.label.trim() && newCrop.value.category
})

// Methods
const getCategoryColor = (category) => {
  const colors = {
    row: 'bg-blue-100 text-blue-800',
    specialty: 'bg-purple-100 text-purple-800',
    tree: 'bg-green-100 text-green-800',
    vegetable: 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-800'
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

const addCrop = () => {
  if (!canAddCrop.value) return

  const crop = {
    label: newCrop.value.label.trim(),
    value: `${newCrop.value.category}:${newCrop.value.label.toLowerCase().replace(/\s+/g, '-')}`,
    category: newCrop.value.category
  }

  selectedCrops.value.push(crop)
  emit('update:modelValue', selectedCrops.value)

  // Reset form
  newCrop.value = {
    label: '',
    category: ''
  }
}

const removeCrop = (index) => {
  selectedCrops.value.splice(index, 1)
  emit('update:modelValue', selectedCrops.value)
}

// Watch for external changes
import { watch } from 'vue'
watch(() => props.modelValue, (newValue) => {
  selectedCrops.value = [...newValue]
}, { deep: true })
</script>
