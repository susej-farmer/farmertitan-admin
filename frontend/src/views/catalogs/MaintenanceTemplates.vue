<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Maintenance Templates</h1>
        <p class="text-gray-600 mt-1">Manage maintenance template catalog with task series and requirements</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Template
      </button>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search templates..."
              class="form-input"
            />
          </div>
          <div>
            <select v-model="selectedType" class="form-select">
              <option value="">All Equipment Types</option>
              <option v-for="type in equipmentTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>
          <div>
            <button 
              @click="loadTemplates"
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
      <p class="text-gray-600">Loading maintenance templates...</p>
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
        <button @click="loadTemplates" class="btn btn-primary">
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
              <th class="table-header-cell">Template Name</th>
              <th class="table-header-cell">Equipment Type</th>
              <th class="table-header-cell">Category</th>
              <th class="table-header-cell">Interval</th>
              <th class="table-header-cell">Priority</th>
              <th class="table-header-cell">Created</th>
              <th class="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="template in templates" :key="template.id" class="table-row">
              <td class="table-cell font-medium">{{ template.name }}</td>
              <td class="table-cell">{{ template._equipment_type?.name || 'N/A' }}</td>
              <td class="table-cell">
                <span v-if="template._part_type" class="badge bg-blue-100 text-blue-800">Part</span>
                <span v-else-if="template._consumable_type" class="badge bg-green-100 text-green-800">Consumable</span>
                <span v-else class="badge bg-gray-100 text-gray-800">Unknown</span>
              </td>
              <td class="table-cell">
                <span v-if="template.schedule_info">
                  {{ template.schedule_info.interval }} {{ template.schedule_info.schedule_type }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="table-cell">
                <span v-if="template.priority" class="badge"
                      :class="{
                        'bg-red-100 text-red-800': template.priority === 'high',
                        'bg-yellow-100 text-yellow-800': template.priority === 'medium',
                        'bg-gray-100 text-gray-800': template.priority === 'low'
                      }">
                  {{ template.priority }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="table-cell">{{ formatDate(template.created_at) }}</td>
              <td class="table-cell">
                <div class="flex items-center space-x-2">
                  <button 
                    @click="viewTemplate(template)"
                    class="btn btn-sm btn-secondary"
                  >
                    View
                  </button>
                  <button 
                    @click="deleteTemplate(template)"
                    class="btn btn-sm btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="templates.length === 0" class="table-row">
              <td colspan="7" class="table-cell text-center text-gray-500 py-8">
                No maintenance templates found
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

    <!-- Complex Modal for Template Creation -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" @click="closeModal">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
              Maintenance Template Creation
            </h3>
            
            <div class="space-y-6">
              <!-- Template Basic Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Template Name *</label>
                  <input type="text" class="form-input" placeholder="e.g. Monthly Engine Maintenance" disabled />
                </div>
                <div>
                  <label class="form-label">Equipment Type *</label>
                  <select class="form-select" disabled>
                    <option>Select Equipment Type</option>
                  </select>
                </div>
              </div>
              
              <!-- Interval Configuration -->
              <div class="border rounded-lg p-4 bg-gray-50">
                <h4 class="font-medium text-gray-900 mb-3">Maintenance Intervals</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="form-label">Hours Interval</label>
                    <input type="number" class="form-input" placeholder="100" disabled />
                  </div>
                  <div>
                    <label class="form-label">Time Interval</label>
                    <select class="form-select" disabled>
                      <option>Monthly</option>
                      <option>Weekly</option>
                      <option>Quarterly</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">Priority</label>
                    <select class="form-select" disabled>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <!-- Task Series -->
              <div class="border rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">Task Series</h4>
                <div class="space-y-3">
                  <div class="border rounded p-3 bg-gray-50">
                    <div class="flex justify-between items-center mb-2">
                      <h5 class="font-medium">Oil Change Tasks</h5>
                      <span class="text-sm text-gray-500">30 min estimated</span>
                    </div>
                    <ul class="text-sm text-gray-600 space-y-1">
                      <li>• Drain old oil</li>
                      <li>• Replace oil filter</li>
                      <li>• Add new oil</li>
                      <li>• Check oil level</li>
                    </ul>
                  </div>
                  <button class="btn btn-sm btn-secondary" disabled>Add Task Series</button>
                </div>
              </div>
              
              <!-- Required Parts -->
              <div class="border rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">Required Parts & Consumables</h4>
                <div class="space-y-2">
                  <div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                    <span>Engine Oil Filter</span>
                    <span class="text-sm text-gray-500">Qty: 1</span>
                  </div>
                  <div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                    <span>Motor Oil (5W-30)</span>
                    <span class="text-sm text-gray-500">Qty: 6 qt</span>
                  </div>
                  <button class="btn btn-sm btn-secondary" disabled>Add Part Requirement</button>
                </div>
              </div>
            </div>
            
            <div class="mt-6 text-center">
              <p class="text-gray-600 mb-4">This advanced template creation system is being implemented.</p>
            </div>
          </div>
          
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              @click="closeModal"
              class="btn btn-secondary"
            >
              Close
            </button>
          </div>
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
  name: 'MaintenanceTemplates',
  setup() {
    const { success, error: showError } = useNotifications()
    const { confirmDelete } = useModals()
    
    // State
    const templates = ref([])
    const equipmentTypes = ref([])
    const loading = ref(false)
    const error = ref('')
    const searchQuery = ref('')
    const selectedType = ref('')
    const showCreateModal = ref(false)
    
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
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
    
    const loadTemplates = async () => {
      loading.value = true
      error.value = ''
      
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value,
          equipmentType: selectedType.value || null
        }
        
        const response = await catalogsApi.getMaintenanceTemplates(params)
        
        if (response.success) {
          templates.value = response.data
          Object.assign(pagination, response.pagination)
        } else {
          throw new Error(response.message || 'Failed to load maintenance templates')
        }
      } catch (err) {
        console.error('Failed to load templates:', err)
        error.value = err.userMessage || err.message || 'Failed to load templates'
        templates.value = []
      } finally {
        loading.value = false
      }
    }
    
    const goToPage = (page) => {
      pagination.page = page
      loadTemplates()
    }
    
    const viewTemplate = (template) => {
      // TODO: Implement template view/edit modal
      showError('View Template', 'Template viewing is not yet implemented')
    }
    
    const deleteTemplate = async (template) => {
      const confirmed = await confirmDelete(template.name)
      if (!confirmed) return
      
      try {
        const response = await catalogsApi.deleteMaintenanceTemplate(template.id)
        if (response.success) {
          success('Maintenance template deleted successfully')
          loadTemplates()
        } else {
          throw new Error(response.message || 'Failed to delete maintenance template')
        }
      } catch (err) {
        console.error('Failed to delete maintenance template:', err)
        showError('Delete Failed', err.userMessage || err.message)
      }
    }
    
    const closeModal = () => {
      showCreateModal.value = false
    }
    
    // formatDate is now imported from @/utils/formatters
    
    // Watch for filter changes
    watch([selectedType], () => {
      pagination.page = 1
      loadTemplates()
    })
    
    // Lifecycle
    onMounted(() => {
      loadEquipmentTypes()
      loadTemplates()
    })
    
    return {
      templates,
      equipmentTypes,
      loading,
      error,
      searchQuery,
      selectedType,
      pagination,
      showCreateModal,
      loadTemplates,
      goToPage,
      viewTemplate,
      deleteTemplate,
      closeModal,
      formatDate // imported from utils
    }
  }
}
</script>
