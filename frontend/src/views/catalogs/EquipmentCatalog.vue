<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Equipment Catalog</h1>
        <p class="text-gray-600 mt-1">Manage equipment inventory</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Equipment
      </button>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search equipment..."
              class="form-input"
            />
          </div>
          <div>
            <select v-model="selectedType" class="form-select">
              <option value="">All Types</option>
              <option v-for="type in equipmentTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>
          <div>
            <select v-model="selectedMake" class="form-select">
              <option value="">All Makes</option>
              <option v-for="make in equipmentMakes" :key="make.id" :value="make.id">
                {{ make.name }}
              </option>
            </select>
          </div>
          <div>
            <button 
              @click="loadEquipment"
              class="btn btn-secondary w-full"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="loading-spinner w-8 h-8 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading equipment...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card">
      <div class="card-body text-center py-8">
        <div class="text-red-500 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button @click="loadEquipment" class="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div v-else class="card">
      <div class="table-container">
        <table class="table">
          <thead class="table-header">
            <tr>
              <th class="table-header-cell">Type</th>
              <th class="table-header-cell">Make</th>
              <th class="table-header-cell">Model</th>
              <th class="table-header-cell">Trim</th>
              <th class="table-header-cell">Year</th>
              <th class="table-header-cell">Created</th>
              <th class="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="item in equipment" :key="item.id" class="table-row">
              <td class="table-cell font-medium">{{ item._equipment_type?.name || 'N/A' }}</td>
              <td class="table-cell">{{ item._equipment_make?.name || 'N/A' }}</td>
              <td class="table-cell">{{ item._equipment_model?.name || 'N/A' }}</td>
              <td class="table-cell">{{ item._equipment_trim?.name || '-' }}</td>
              <td class="table-cell">{{ item.year || '-' }}</td>
              <td class="table-cell">{{ formatDate(item.created_at) }}</td>
              <td class="table-cell">
                <div class="flex items-center space-x-2">
                  <button 
                    @click="editEquipment(item)"
                    class="btn btn-sm btn-secondary"
                  >
                    Edit
                  </button>
                  <button 
                    @click="deleteEquipment(item)"
                    class="btn btn-sm btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="equipment.length === 0" class="table-row">
              <td colspan="7" class="table-cell text-center text-gray-500 py-8">
                No equipment catalog entries found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="card-footer">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-700">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of 
            {{ pagination.total }} results
          </p>
          <div class="flex items-center space-x-2">
            <button 
              @click="goToPage(pagination.page - 1)"
              :disabled="!pagination.hasPrev"
              class="btn btn-sm btn-secondary"
              :class="{ 'opacity-50 cursor-not-allowed': !pagination.hasPrev }"
            >
              Previous
            </button>
            <span class="text-sm text-gray-700">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </span>
            <button 
              @click="goToPage(pagination.page + 1)"
              :disabled="!pagination.hasNext"
              class="btn btn-sm btn-secondary"
              :class="{ 'opacity-50 cursor-not-allowed': !pagination.hasNext }"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" @click="closeModal">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form @submit.prevent="saveEquipment">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                {{ showEditModal ? 'Edit Equipment Catalog Entry' : 'Create Equipment Catalog Entry' }}
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label class="form-label">Equipment Type *</label>
                  <select v-model="form.type" required class="form-select" @change="onTypeChange">
                    <option value="">Select equipment type</option>
                    <option v-for="type in equipmentTypes" :key="type.id" :value="type.id">
                      {{ type.name }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="form-label">Make *</label>
                  <select v-model="form.make" required class="form-select" @change="onMakeChange">
                    <option value="">Select make</option>
                    <option v-for="make in equipmentMakes" :key="make.id" :value="make.id">
                      {{ make.name }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="form-label">Model *</label>
                  <select v-model="form.model" required class="form-select" @change="onModelChange" :disabled="!form.make">
                    <option value="">Select model</option>
                    <option v-for="model in availableModels" :key="model.id" :value="model.id">
                      {{ model.name }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="form-label">Trim (Optional)</label>
                  <select v-model="form.trim" class="form-select" :disabled="!form.model">
                    <option value="">No trim selected</option>
                    <option v-for="trim in availableTrims" :key="trim.id" :value="trim.id">
                      {{ trim.name }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="form-label">Year (Optional)</label>
                  <input
                    v-model.number="form.year"
                    type="number"
                    min="1900"
                    max="2030"
                    class="form-input"
                    placeholder="Enter year"
                  />
                </div>
              </div>
            </div>
            
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button 
                type="submit" 
                :disabled="saving"
                class="btn btn-primary sm:ml-3 sm:w-auto"
              >
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button 
                type="button" 
                @click="closeModal"
                class="btn btn-secondary mt-3 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue'
import { catalogsApi } from '@/services/catalogsApi'
import { useNotifications } from '@/composables/useNotifications'
import { useModals } from '@/composables/useModals'
import { formatDate } from '@/utils/formatters'

export default {
  name: 'EquipmentCatalog',
  setup() {
    const { success, error: showError } = useNotifications()
    const { confirmDelete } = useModals()
    
    // State
    const equipment = ref([])
    const equipmentTypes = ref([])
    const equipmentMakes = ref([])
    const availableModels = ref([])
    const availableTrims = ref([])
    const loading = ref(false)
    const error = ref('')
    const searchQuery = ref('')
    const selectedType = ref('')
    const selectedMake = ref('')
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const saving = ref(false)
    
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    })
    
    const form = reactive({
      id: null,
      type: '',
      make: '',
      model: '',
      trim: '',
      year: null
    })
    
    // Methods
    const loadEquipmentTypes = async () => {
      try {
        const response = await catalogsApi.getEquipmentTypesDropdown()
        if (response.success) {
          equipmentTypes.value = response.data
        }
      } catch (err) {
        console.error('Failed to load equipment types:', err)
      }
    }
    
    const loadEquipmentMakes = async () => {
      try {
        const response = await catalogsApi.getEquipmentMakesDropdown()
        if (response.success) {
          equipmentMakes.value = response.data
        }
      } catch (err) {
        console.error('Failed to load equipment makes:', err)
      }
    }
    
    const loadEquipment = async () => {
      loading.value = true
      error.value = ''
      
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value,
          typeId: selectedType.value || null,
          makeId: selectedMake.value || null
        }
        
        const response = await catalogsApi.getEquipmentCatalog(params)
        
        if (response.success) {
          equipment.value = response.data
          Object.assign(pagination, response.pagination)
        } else {
          throw new Error(response.message || 'Failed to load equipment catalog')
        }
      } catch (err) {
        console.error('Failed to load equipment:', err)
        error.value = err.userMessage || err.message || 'Failed to load equipment catalog'
        equipment.value = []
      } finally {
        loading.value = false
      }
    }
    
    const goToPage = (page) => {
      pagination.page = page
      loadEquipment()
    }
    
    const onTypeChange = () => {
      // Clear dependent fields when type changes
      form.make = ''
      form.model = ''
      form.trim = ''
      availableModels.value = []
      availableTrims.value = []
    }
    
    const onMakeChange = async () => {
      // Clear dependent fields
      form.model = ''
      form.trim = ''
      availableTrims.value = []
      
      // Load models for selected make
      if (form.make) {
        try {
          const response = await catalogsApi.getModelsByMake(form.make)
          if (response.success) {
            availableModels.value = response.data
          }
        } catch (err) {
          console.error('Failed to load models:', err)
          availableModels.value = []
        }
      } else {
        availableModels.value = []
      }
    }
    
    const onModelChange = async () => {
      // Clear dependent fields
      form.trim = ''
      
      // Load trims for selected make+model
      if (form.make && form.model) {
        try {
          const response = await catalogsApi.getTrimsByModel(form.make, form.model)
          if (response.success) {
            availableTrims.value = response.data
          }
        } catch (err) {
          console.error('Failed to load trims:', err)
          availableTrims.value = []
        }
      } else {
        availableTrims.value = []
      }
    }
    
    const editEquipment = async (item) => {
      form.id = item.id
      form.type = item.type
      form.make = item.make
      form.model = item.model
      form.trim = item.trim || ''
      form.year = item.year || null
      
      // Load models for the selected make
      if (form.make) {
        await onMakeChange()
      }
      
      // Load trims for the selected model
      if (form.make && form.model) {
        await onModelChange()
      }
      
      showEditModal.value = true
    }
    
    const deleteEquipment = async (item) => {
      const typeDisplay = item._equipment_type?.name || 'Unknown'
      const makeDisplay = item._equipment_make?.name || 'Unknown'
      const modelDisplay = item._equipment_model?.name || 'Unknown'
      const displayName = `${typeDisplay} ${makeDisplay} ${modelDisplay}`
      
      const confirmed = await confirmDelete(displayName)
      if (!confirmed) return
      
      try {
        const response = await catalogsApi.deleteEquipmentCatalogItem(item.id)
        if (response.success) {
          success('Equipment catalog entry deleted successfully')
          loadEquipment()
        } else {
          throw new Error(response.message || 'Failed to delete equipment catalog entry')
        }
      } catch (err) {
        console.error('Failed to delete equipment catalog entry:', err)
        showError('Delete Failed', err.userMessage || err.message)
      }
    }
    
    const saveEquipment = async () => {
      saving.value = true
      
      try {
        const data = {
          type: form.type,
          make: form.make,
          model: form.model,
          trim: form.trim || null,
          year: form.year || null
        }
        
        let response
        if (showEditModal.value) {
          response = await catalogsApi.updateEquipmentCatalogItem(form.id, data)
        } else {
          response = await catalogsApi.createEquipmentCatalogItem(data)
        }
        
        if (response.success) {
          success(`Equipment catalog entry ${showEditModal.value ? 'updated' : 'created'} successfully`)
          closeModal()
          loadEquipment()
        } else {
          throw new Error(response.message || 'Failed to save equipment catalog entry')
        }
      } catch (err) {
        console.error('Failed to save equipment catalog entry:', err)
        showError('Save Failed', err.userMessage || err.message)
      } finally {
        saving.value = false
      }
    }
    
    const closeModal = () => {
      showCreateModal.value = false
      showEditModal.value = false
      form.id = null
      form.type = ''
      form.make = ''
      form.model = ''
      form.trim = ''
      form.year = null
      availableModels.value = []
      availableTrims.value = []
    }
    
    // formatDate is now imported from @/utils/formatters
    
    // Watch for filter changes
    watch([selectedType, selectedMake], () => {
      pagination.page = 1
      loadEquipment()
    })
    
    // Lifecycle
    onMounted(() => {
      loadEquipmentTypes()
      loadEquipmentMakes()
      loadEquipment()
    })
    
    return {
      equipment,
      equipmentTypes,
      equipmentMakes,
      availableModels,
      availableTrims,
      loading,
      error,
      searchQuery,
      selectedType,
      selectedMake,
      pagination,
      showCreateModal,
      showEditModal,
      saving,
      form,
      loadEquipment,
      goToPage,
      onTypeChange,
      onMakeChange,
      onModelChange,
      editEquipment,
      deleteEquipment,
      saveEquipment,
      closeModal,
      formatDate // imported from utils
    }
  }
}
</script>
