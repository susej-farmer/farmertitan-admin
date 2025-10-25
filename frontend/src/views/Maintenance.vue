<template>
  <div class="maintenance-view">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Maintenance Templates</h1>
      <p class="text-gray-600 mt-1">Manage equipment maintenance templates and schedules</p>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-12 gap-3 items-end">
        <!-- Equipment Type Filter -->
        <div class="col-span-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select 
            v-model="filters.equipment_type" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Types</option>
            <option v-for="type in filterOptions.types" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>

        <!-- Equipment Make Filter -->
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Make</label>
          <select 
            v-model="filters.equipment_make" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Makes</option>
            <option v-for="make in filterOptions.makes" :key="make" :value="make">
              {{ make }}
            </option>
          </select>
        </div>

        <!-- Equipment Model Filter -->
        <div class="col-span-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select 
            v-model="filters.equipment_model" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Models</option>
            <option v-for="model in filterOptions.models" :key="model" :value="model">
              {{ model }}
            </option>
          </select>
        </div>

        <!-- Equipment Trim Filter -->
        <div v-if="filterOptions.trims.length > 0" class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Trim</label>
          <select 
            v-model="filters.equipment_trim" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Trims</option>
            <option v-for="trim in filterOptions.trims" :key="trim" :value="trim">
              {{ trim }}
            </option>
          </select>
        </div>

        <!-- Clear Filters Button -->
        <div :class="filterOptions.trims.length > 0 ? 'col-span-2' : 'col-span-4'">
          <button 
            @click="clearFilters"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      <span class="ml-2 text-gray-600">Loading equipment templates...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error Loading Data</h3>
          <div class="mt-2 text-sm text-red-700">{{ error }}</div>
        </div>
      </div>
    </div>

    <!-- Equipment Table -->
    <div v-else class="bg-white shadow rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Make
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Model
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trim
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Year
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Maintenance Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="equipment in paginatedEquipment" :key="`${equipment._equipment_type_id}-${equipment._equipment_id}`" class="hover:bg-gray-50">
            <!-- Type -->
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <template v-if="isEditing(equipment)">
                <select 
                  v-model="editingData.equipment_type_name"
                  class="w-full rounded border-gray-300 text-sm"
                >
                  <option value="">Select Type</option>
                  <option v-for="type in catalogOptions.types" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
              </template>
              <template v-else>
                {{ equipment.equipment_type_name || '-' }}
              </template>
            </td>
            
            <!-- Make -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <template v-if="isEditing(equipment)">
                <select 
                  v-model="editingData.equipment_make_name"
                  class="w-full rounded border-gray-300 text-sm"
                >
                  <option value="">Select Make</option>
                  <option v-for="make in catalogOptions.makes" :key="make" :value="make">
                    {{ make }}
                  </option>
                </select>
              </template>
              <template v-else>
                {{ equipment.equipment_make_name || '-' }}
              </template>
            </td>
            
            <!-- Model -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <template v-if="isEditing(equipment)">
                <select 
                  v-model="editingData.equipment_model_name"
                  class="w-full rounded border-gray-300 text-sm"
                >
                  <option value="">Select Model</option>
                  <option v-for="model in catalogOptions.models" :key="model" :value="model">
                    {{ model }}
                  </option>
                </select>
              </template>
              <template v-else>
                {{ equipment.equipment_model_name || '-' }}
              </template>
            </td>
            
            <!-- Trim -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <template v-if="isEditing(equipment)">
                <select 
                  v-model="editingData.equipment_trim_name"
                  class="w-full rounded border-gray-300 text-sm"
                >
                  <option value="">Select Trim</option>
                  <option v-for="trim in catalogOptions.trims" :key="trim" :value="trim">
                    {{ trim }}
                  </option>
                </select>
              </template>
              <template v-else>
                {{ equipment.equipment_trim_name || '-' }}
              </template>
            </td>
            
            <!-- Year -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <template v-if="isEditing(equipment)">
                <input 
                  v-model="editingData.equipment_year"
                  type="number"
                  min="1900"
                  max="2030"
                  class="w-full rounded border-gray-300 text-sm"
                  placeholder="Year"
                />
              </template>
              <template v-else>
                {{ equipment.equipment_year || '-' }}
              </template>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getMaintenanceStatusClass(equipment.maintenance_count)">
                {{ equipment.maintenance_count }} template{{ equipment.maintenance_count !== 1 ? 's' : '' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(equipment.created_at) || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex space-x-2">
                <button
                  @click="viewTemplates(equipment)"
                  :disabled="isEditing(equipment)"
                  class="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="View Templates"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                
                <template v-if="isEditing(equipment)">
                  <button
                    @click="saveEquipment(equipment)"
                    :disabled="isUpdating"
                    class="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                    title="Save"
                  >
                    <svg v-if="!isUpdating" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </button>
                  <button
                    @click="cancelEdit()"
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
                    @click="startEdit(equipment)"
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

      <!-- Empty State -->
      <div v-if="filteredEquipment.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No maintenance templates found</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ Object.keys(filters).some(key => filters[key]) ? 'Try adjusting your filters.' : 'Get started by creating equipment maintenance templates.' }}
        </p>
      </div>

      <!-- Pagination -->
      <div v-if="filteredEquipment.length > 0" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <!-- Mobile pagination info -->
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="goToPreviousPage"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            @click="goToNextPage"
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        <!-- Desktop pagination -->
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ ((currentPage - 1) * itemsPerPage) + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredEquipment.length) }}</span>
              of
              <span class="font-medium">{{ filteredEquipment.length }}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <!-- Previous button -->
              <button
                @click="goToPreviousPage"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>

              <!-- Page numbers -->
              <template v-for="page in Math.min(totalPages, 7)" :key="page">
                <button
                  v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
                  @click="goToPage(page)"
                  :class="[
                    page === currentPage
                      ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                  ]"
                >
                  {{ page }}
                </button>
                <span
                  v-else-if="(page === 2 && currentPage > 4) || (page === totalPages - 1 && currentPage < totalPages - 3)"
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              </template>

              <!-- Next button -->
              <button
                @click="goToNextPage"
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Templates Modal -->
    <MaintenanceTemplatesModal
      v-if="showTemplatesModal"
      :equipment="selectedEquipment"
      @close="closeTemplatesModal"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { maintenanceApi } from '@/services/maintenanceApi'
import { catalogApi } from '@/services/catalogApi'
import { formatDate } from '@/utils/formatters'
import MaintenanceTemplatesModal from '@/components/maintenance/MaintenanceTemplatesModal.vue'

const router = useRouter()

// Reactive state
const equipment = ref([])
const filteredEquipment = ref([])
const isLoading = ref(true)
const error = ref(null)
const showTemplatesModal = ref(false)
const selectedEquipment = ref(null)

// Inline editing state
const editingEquipment = ref(null)
const editingData = ref({})
const isUpdating = ref(false)
const catalogOptions = ref({
  types: [],
  makes: [],
  models: [],
  trims: []
})

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = computed(() => Math.ceil(filteredEquipment.value.length / itemsPerPage.value))
const paginatedEquipment = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredEquipment.value.slice(start, end)
})

// Filters
const filters = reactive({
  equipment_type: '',
  equipment_make: '',
  equipment_model: '',
  equipment_trim: ''
})

// Filter options (computed from data)
const filterOptions = computed(() => {
  const options = {
    types: [...new Set(equipment.value.map(e => e.equipment_type_name).filter(Boolean))].sort(),
    makes: [...new Set(equipment.value.map(e => e.equipment_make_name).filter(Boolean))].sort(),
    models: [...new Set(equipment.value.map(e => e.equipment_model_name).filter(Boolean))].sort(),
    trims: [...new Set(equipment.value.map(e => e.equipment_trim_name).filter(Boolean))].sort()
  }
  return options
})

// Load equipment data
const loadEquipment = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await maintenanceApi.getEquipmentWithMaintenanceTemplates()
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to load equipment templates')
    }
    
    equipment.value = response.data
    applyFilters()
  } catch (err) {
    console.error('Error loading equipment:', err)
    error.value = err.userMessage || err.message
  } finally {
    isLoading.value = false
  }
}

// Apply filters
const applyFilters = () => {
  filteredEquipment.value = equipment.value.filter(item => {
    return (
      (!filters.equipment_type || item.equipment_type_name === filters.equipment_type) &&
      (!filters.equipment_make || item.equipment_make_name === filters.equipment_make) &&
      (!filters.equipment_model || item.equipment_model_name === filters.equipment_model) &&
      (!filters.equipment_trim || item.equipment_trim_name === filters.equipment_trim)
    )
  })
  // Reset to first page when filters change
  currentPage.value = 1
}

// Clear all filters
const clearFilters = () => {
  filters.equipment_type = ''
  filters.equipment_make = ''
  filters.equipment_model = ''
  filters.equipment_trim = ''
  currentPage.value = 1
  applyFilters()
}

// Pagination functions
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const goToFirstPage = () => goToPage(1)
const goToLastPage = () => goToPage(totalPages.value)
const goToPreviousPage = () => goToPage(currentPage.value - 1)
const goToNextPage = () => goToPage(currentPage.value + 1)

// Inline editing functions
const isEditing = (equipment) => {
  return editingEquipment.value && 
         editingEquipment.value._equipment_type_id === equipment._equipment_type_id &&
         editingEquipment.value._equipment_id === equipment._equipment_id
}

const startEdit = (equipment) => {
  editingEquipment.value = equipment
  editingData.value = {
    equipment_type_name: equipment.equipment_type_name || '',
    equipment_make_name: equipment.equipment_make_name || '',
    equipment_model_name: equipment.equipment_model_name || '',
    equipment_trim_name: equipment.equipment_trim_name || '',
    equipment_year: equipment.equipment_year || ''
  }
  loadCatalogOptions()
}

const cancelEdit = () => {
  editingEquipment.value = null
  editingData.value = {}
}

const saveEquipment = async (equipment) => {
  try {
    isUpdating.value = true
    error.value = null
    
    // Get the first task series ID (we need at least one to update)
    const taskSeriesId = equipment.task_series_ids?.[0]
    
    if (!taskSeriesId) {
      throw new Error('No task series ID found for this equipment')
    }
    
    // Validate that we have all required names
    if (!editingData.value.equipment_type_name || !editingData.value.equipment_make_name || !editingData.value.equipment_model_name) {
      throw new Error('Please select valid equipment type, make, and model before saving')
    }
    
    // Call the validation API with the equipment data (using names)
    const response = await maintenanceApi.validateAndUpdateEquipment(taskSeriesId, {
      equipment_type_name: editingData.value.equipment_type_name,
      equipment_make_name: editingData.value.equipment_make_name,
      equipment_model_name: editingData.value.equipment_model_name,
      equipment_trim_name: editingData.value.equipment_trim_name || null,
      equipment_year: editingData.value.equipment_year || null
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update equipment')
    }
    
    // Success - reload equipment data to show updates
    await loadEquipment()
    cancelEdit()
    
    // Show success message
    console.log('Equipment updated successfully:', response.message)
    
  } catch (error) {
    console.error('Error saving equipment:', error)
    error.value = error.userMessage || error.message || 'Failed to save equipment changes'
  } finally {
    isUpdating.value = false
  }
}

const loadCatalogOptions = async () => {
  try {
    // For now using the existing filter options as a starting point
    catalogOptions.value = {
      types: filterOptions.value.types,
      makes: filterOptions.value.makes,
      models: filterOptions.value.models,
      trims: filterOptions.value.trims
    }
  } catch (error) {
    console.error('Error loading catalog options:', error)
  }
}

// Load models when make changes
const loadModelsForMake = async (makeId) => {
  try {
    const response = await catalogApi.getEquipmentModelsByMake(makeId)
    catalogOptions.value.models = response.data || []
    // Clear trims when make changes
    catalogOptions.value.trims = []
  } catch (error) {
    console.error('Error loading models:', error)
  }
}

// Load trims when model changes
const loadTrimsForModel = async (makeId, modelId) => {
  try {
    const response = await catalogApi.getEquipmentTrimsByModel(makeId, modelId)
    catalogOptions.value.trims = response.data || []
  } catch (error) {
    console.error('Error loading trims:', error)
  }
}

// Handle make change
const onMakeChange = async () => {
  editingData.value.equipment_model_id = ''
  editingData.value.equipment_trim_id = ''
  catalogOptions.value.models = []
  catalogOptions.value.trims = []
  
  if (editingData.value.equipment_make_id) {
    await loadModelsForMake(editingData.value.equipment_make_id)
  }
}

// Handle model change
const onModelChange = async () => {
  editingData.value.equipment_trim_id = ''
  catalogOptions.value.trims = []
  
  if (editingData.value.equipment_make_id && editingData.value.equipment_model_id) {
    await loadTrimsForModel(editingData.value.equipment_make_id, editingData.value.equipment_model_id)
  }
}

// Find equipment IDs based on names
const findEquipmentIds = async (equipment) => {
  try {
    // Find make ID by name
    if (equipment.equipment_make_name) {
      const make = catalogOptions.value.makes.find(m => m.name === equipment.equipment_make_name)
      if (make) {
        editingData.value.equipment_make_id = make.id
        
        // Load models for this make
        await loadModelsForMake(make.id)
        
        // Find model ID by name
        if (equipment.equipment_model_name) {
          const model = catalogOptions.value.models.find(m => m.name === equipment.equipment_model_name)
          if (model) {
            editingData.value.equipment_model_id = model.id
            
            // Load trims for this model
            await loadTrimsForModel(make.id, model.id)
            
            // Find trim ID by name
            if (equipment.equipment_trim_name) {
              const trim = catalogOptions.value.trims.find(t => t.name === equipment.equipment_trim_name)
              if (trim) {
                editingData.value.equipment_trim_id = trim.id
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding equipment IDs:', error)
  }
}

// Get maintenance status styling
const getMaintenanceStatusClass = (count) => {
  if (count === 0) {
    return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800'
  } else if (count <= 3) {
    return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800'
  } else {
    return 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'
  }
}

// Note: formatDate is now imported from @/utils/formatters

// View templates action
const viewTemplates = (equipment) => {
  selectedEquipment.value = equipment
  showTemplatesModal.value = true
}


// Close templates modal
const closeTemplatesModal = () => {
  showTemplatesModal.value = false
  selectedEquipment.value = null
}

// Initialize
onMounted(async () => {
  await loadEquipment()
})
</script>

<style scoped>
.maintenance-view {
  @apply max-w-7xl mx-auto;
}
</style>