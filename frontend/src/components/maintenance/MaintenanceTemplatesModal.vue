<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="$emit('close')">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-[85%] lg:w-[85%] xl:w-[85%] shadow-lg rounded-md bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          Maintenance Templates
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Equipment Info -->
      <div class="py-4 border-b">
        <!-- Equipment Type and Templates Count -->
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class="font-medium text-gray-700">Type:</span>
            <span class="ml-2 text-gray-900">{{ equipment.equipment_type_name || '-' }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Templates:</span>
            <span class="ml-2 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
              {{ equipment.maintenance_count }}
            </span>
          </div>
        </div>

        <!-- Specific Equipment Details (only show if equipment_id exists) -->
        <div v-if="equipment._equipment_id" class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-medium text-gray-700">Make:</span>
            <span class="ml-2 text-gray-900">{{ equipment.equipment_make_name || '-' }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Model:</span>
            <span class="ml-2 text-gray-900">{{ equipment.equipment_model_name || '-' }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Trim:</span>
            <span class="ml-2 text-gray-900">{{ equipment.equipment_trim_name || '-' }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Year:</span>
            <span class="ml-2 text-gray-900">{{ equipment.equipment_year || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Loading maintenance templates...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="py-4">
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error Loading Templates</h3>
              <div class="mt-2 text-sm text-red-700">{{ error }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Templates List -->
      <div v-else class="py-4">
        <div v-if="templates.length === 0" class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p class="mt-1 text-sm text-gray-500">This equipment doesn't have any maintenance templates configured.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule Type
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interval
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit/Source
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="template in templates" :key="template.task_template" class="hover:bg-gray-50">
                <!-- Task Name -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input 
                    v-if="editingTemplate === template.task_template"
                    v-model="editingData.name"
                    class="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    @keyup.enter="saveTemplate(template)"
                    @keyup.escape="cancelEdit"
                  />
                  <div v-else class="text-sm font-medium text-gray-900">{{ template.name }}</div>
                </td>
                
                <!-- Description -->
                <td class="px-6 py-4">
                  <input 
                    v-if="editingTemplate === template.task_template"
                    v-model="editingData.description"
                    class="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    @keyup.enter="saveTemplate(template)"
                    @keyup.escape="cancelEdit"
                  />
                  <div v-else class="text-sm text-gray-900">{{ template.description || '-' }}</div>
                </td>
                
                <!-- Schedule Type -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <select 
                    v-if="editingTemplate === template.task_template"
                    v-model="editingData.schedule_type"
                    class="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option v-for="type in timeTypes" :key="type" :value="type">
                      {{ formatScheduleType(type) }}
                    </option>
                  </select>
                  <span v-else :class="getScheduleTypeClass(template.schedule_type)">
                    {{ formatScheduleType(template.schedule_type) }}
                  </span>
                </td>
                
                <!-- Interval -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input 
                    v-if="editingTemplate === template.task_template"
                    v-model="editingData.schedule_value"
                    type="number"
                    min="1"
                    class="w-20 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    @keyup.enter="saveTemplate(template)"
                    @keyup.escape="cancelEdit"
                  />
                  <div v-else class="text-sm text-gray-900">
                    {{ template.schedule_value || '-' }}
                  </div>
                </td>
                
                <!-- Unit/Source -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input 
                    v-if="editingTemplate === template.task_template"
                    v-model="editingData.metadata_value"
                    placeholder="engine_hours"
                    class="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    @keyup.enter="saveTemplate(template)"
                    @keyup.escape="cancelEdit"
                  />
                  <div v-else class="text-sm text-gray-900">
                    {{ getMetadataValue(template.schedule_metadata) }}
                  </div>
                </td>
                
                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center space-x-2">
                    <template v-if="editingTemplate === template.task_template">
                      <button
                        @click="saveTemplate(template)"
                        :disabled="isUpdating"
                        class="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                        title="Save"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        @click="cancelEdit"
                        :disabled="isUpdating"
                        class="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                        title="Cancel"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </template>
                    <template v-else>
                      <button
                        @click="editTemplate(template)"
                        class="p-1 text-gray-600 hover:text-emerald-600"
                        title="Edit"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end pt-4 border-t">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { maintenanceApi } from '@/services/maintenanceApi'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

// State
const templates = ref([])
const isLoading = ref(false)
const error = ref(null)

// Editing state
const editingTemplate = ref(null)
const editingData = ref({})
const isUpdating = ref(false)
const timeTypes = ref([])

// Load templates
const loadTemplates = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const equipmentId = props.equipment._equipment_id
    const equipmentTypeId = props.equipment._equipment_type_id
    
    let response
    if (equipmentId) {
      response = await maintenanceApi.getMaintenanceTasksForEquipment(equipmentId)
    } else if (equipmentTypeId) {
      response = await maintenanceApi.getMaintenanceTasksForEquipmentType(equipmentTypeId)
    } else {
      throw new Error('No equipment ID or equipment type ID provided')
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to load templates')
    }
    
    templates.value = response.data
  } catch (err) {
    console.error('Error loading templates:', err)
    error.value = err.userMessage || err.message
  } finally {
    isLoading.value = false
  }
}

// Format schedule type for display
const formatScheduleType = (type) => {
  if (!type) return 'Unknown'
  
  switch (type) {
    case 'schedule:hours':
      return 'Hours'
    case 'schedule:distance':
      return 'Distance'
    case 'schedule:cron':
      return 'Cron'
    case 'schedule:days':
      return 'Days'
    default:
      return type.replace('schedule:', '').toUpperCase()
  }
}

// Format schedule value for display
const formatScheduleValue = (type, value) => {
  if (!type || !value) return '-'
  
  switch (type) {
    case 'schedule:hours':
      return `Every ${value} hours`
    case 'schedule:distance':
      return `Every ${value} km`
    case 'schedule:cron':
      return `${value}`
    case 'schedule:days':
      return `Every ${value} days`
    default:
      return `${value}`
  }
}

// Get metadata value from JSON
const getMetadataValue = (metadata) => {
  if (!metadata) return '-'
  
  // If it's a string JSON, parse it
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return Object.values(parsed)[0] || metadata
    } catch {
      return metadata
    }
  }
  
  // If it's already an object, get the first value
  if (typeof metadata === 'object') {
    return Object.values(metadata)[0] || '-'
  }
  
  return metadata.toString()
}

// Format metadata for display (legacy function, keeping for compatibility)
const formatMetadata = (metadata) => {
  if (!metadata) return '-'
  
  if (typeof metadata === 'string') {
    return metadata
  }
  
  if (typeof metadata === 'object') {
    if (metadata.unit) {
      return metadata.unit === 'km' ? 'Kilometers' : 
             metadata.unit === 'miles' ? 'Miles' : metadata.unit
    }
    if (metadata.source) {
      return metadata.source === 'engine_hours' ? 'Engine Hours' : 
             metadata.source === 'hours' ? 'Hours' : metadata.source
    }
    return JSON.stringify(metadata)
  }
  
  return metadata.toString()
}

// Get schedule type styling
const getScheduleTypeClass = (type) => {
  const baseClass = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
  
  switch (type) {
    case 'schedule:hours':
      return `${baseClass} bg-blue-100 text-blue-800`
    case 'schedule:distance':
      return `${baseClass} bg-green-100 text-green-800`
    case 'schedule:cron':
      return `${baseClass} bg-orange-100 text-orange-800`
    case 'schedule:days':
      return `${baseClass} bg-purple-100 text-purple-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
}

// Load time types for schedule selection
const loadTimeTypes = async () => {
  try {
    const response = await maintenanceApi.getTimeTypes()
    if (response.success) {
      // Filter to only show types that start with "schedule"
      timeTypes.value = response.data.filter(type => type.startsWith('schedule'))
    }
  } catch (err) {
    console.error('Error loading time types:', err)
  }
}

// Start editing a template
const editTemplate = (template) => {
  editingTemplate.value = template.task_template
  editingData.value = {
    name: template.name,
    description: template.description,
    schedule_type: template.schedule_type,
    schedule_value: template.schedule_value,
    metadata_value: getMetadataValue(template.schedule_metadata)
  }
}

// Cancel editing
const cancelEdit = () => {
  editingTemplate.value = null
  editingData.value = {}
}

// Save template changes
const saveTemplate = async (template) => {
  try {
    isUpdating.value = true
    
    const response = await maintenanceApi.updateMaintenanceTask(
      template.task_id,
      template.schedule_id,
      editingData.value
    )
    
    if (response.success) {
      // Update the template in the local array
      const index = templates.value.findIndex(t => t.task_template === template.task_template)
      if (index !== -1) {
        templates.value[index] = {
          ...templates.value[index],
          ...editingData.value
        }
      }
      
      cancelEdit()
    } else {
      throw new Error(response.error || 'Failed to update template')
    }
  } catch (err) {
    console.error('Error saving template:', err)
    error.value = err.userMessage || err.message
  } finally {
    isUpdating.value = false
  }
}

// Initialize
onMounted(async () => {
  await Promise.all([
    loadTemplates(),
    loadTimeTypes()
  ])
})
</script>