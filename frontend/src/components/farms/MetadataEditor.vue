<template>
  <div class="space-y-3">
    <!-- Pivot Irrigation Toggle -->
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <label class="text-sm font-medium text-gray-900">Pivot Irrigation</label>
        <p class="text-xs text-gray-500">Enable pivot irrigation system</p>
      </div>
      <button
        type="button"
        @click="togglePivotIrrigation"
        :class="[
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
          pivotIrrigation ? 'bg-emerald-600' : 'bg-gray-200'
        ]"
      >
        <span
          :class="[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            pivotIrrigation ? 'translate-x-5' : 'translate-x-0'
          ]"
        />
      </button>
    </div>

    <!-- Additional Custom Fields -->
    <div class="border border-gray-300 rounded-lg p-4">
      <h4 class="text-sm font-medium text-gray-900 mb-3">Additional Metadata</h4>

      <!-- Existing Custom Fields -->
      <div v-if="customFields.length > 0" class="space-y-2 mb-3">
        <div
          v-for="(field, index) in customFields"
          :key="index"
          class="flex items-center gap-2"
        >
          <input
            v-model="field.key"
            type="text"
            placeholder="Key"
            class="form-input flex-1 text-sm"
            @blur="updateMetadata"
          />
          <input
            v-model="field.value"
            :type="field.type === 'number' ? 'number' : 'text'"
            placeholder="Value"
            class="form-input flex-1 text-sm"
            @blur="updateMetadata"
          />
          <select
            v-model="field.type"
            class="form-select w-24 text-sm"
            @change="updateMetadata"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
          <button
            type="button"
            @click="removeField(index)"
            class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Add Field Button -->
      <button
        type="button"
        @click="addField"
        class="btn btn-sm btn-secondary w-full"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Custom Field
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

// State
const pivotIrrigation = ref(props.modelValue?.pivot_irrigation || false)
const customFields = ref([])

// Initialize custom fields from metadata (excluding known fields)
const initializeCustomFields = () => {
  const metadata = props.modelValue || {}
  const knownFields = ['crops', 'pivot_irrigation', 'created_by']

  customFields.value = Object.entries(metadata)
    .filter(([key]) => !knownFields.includes(key))
    .map(([key, value]) => ({
      key,
      value: String(value),
      type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text'
    }))
}

// Initialize on mount
initializeCustomFields()

// Methods
const togglePivotIrrigation = () => {
  pivotIrrigation.value = !pivotIrrigation.value
  updateMetadata()
}

const addField = () => {
  customFields.value.push({
    key: '',
    value: '',
    type: 'text'
  })
}

const removeField = (index) => {
  customFields.value.splice(index, 1)
  updateMetadata()
}

const updateMetadata = () => {
  const metadata = {
    pivot_irrigation: pivotIrrigation.value
  }

  // Add custom fields (only non-empty keys)
  customFields.value.forEach(field => {
    if (field.key.trim()) {
      let value = field.value

      // Convert value based on type
      if (field.type === 'number') {
        value = parseFloat(value) || 0
      } else if (field.type === 'boolean') {
        value = value === 'true' || value === true
      }

      metadata[field.key.trim()] = value
    }
  })

  emit('update:modelValue', metadata)
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  pivotIrrigation.value = newValue?.pivot_irrigation || false
  initializeCustomFields()
}, { deep: true })
</script>
