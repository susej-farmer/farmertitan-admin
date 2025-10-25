<template>
  <div class="space-y-6">
    <!-- Search and Filters -->
    <div class="card">
      <div class="card-body">
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search equipment makes..."
              class="form-input"
              @keyup.enter="handleSearch"
            />
          </div>
          <button 
            @click="handleSearch"
            class="btn btn-secondary"
            title="Search"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
          <button 
            @click="showCreateModal = true"
            class="btn btn-primary"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Equipment Make
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="loading-spinner w-8 h-8 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading equipment makes...</p>
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
        <button @click="loadEquipmentMakes" class="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div v-else class="card">
      <div class="table-container overflow-x-auto">
        <table class="table min-w-full">
          <thead class="table-header">
            <tr>
              <th class="table-header-cell">Name</th>
              <th class="table-header-cell">Created By</th>
              <th class="table-header-cell">Created In</th>
              <th class="table-header-cell">Created</th>
              <th class="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="make in equipmentMakes" :key="make.id" class="table-row">
              <td class="table-cell font-medium">{{ make.name }}</td>
              <td class="table-cell">{{ make.created_by_name || '-' }}</td>
              <td class="table-cell">{{ make.created_in_name || '-' }}</td>
              <td class="table-cell">{{ formatDate(make.created_at) }}</td>
              <td class="table-cell">
                <div class="flex items-center space-x-2">
                  <button 
                    @click="editMake(make)"
                    class="btn btn-sm btn-secondary"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button 
                    @click="deleteMake(make)"
                    class="btn btn-sm btn-danger"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244 2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="equipmentMakes.length === 0" class="table-row">
              <td colspan="5" class="table-cell text-center text-gray-500 py-8">
                No equipment makes found
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
          <form @submit.prevent="saveMake">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                {{ showEditModal ? 'Edit Equipment Make' : 'Create Equipment Make' }}
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label class="form-label">Name *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    class="form-input"
                    placeholder="Enter equipment make name"
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
import { ref, reactive, onMounted } from 'vue'
import { catalogsApi } from '@/services/catalogsApi'
import { useNotifications } from '@/composables/useNotifications'
import { useModals } from '@/composables/useModals'
import { formatDate } from '@/utils/formatters'

export default {
  name: 'EquipmentMakes',
  setup() {
    const { success, error: showError } = useNotifications()
    const { confirmDelete } = useModals()
    
    // State
    const equipmentMakes = ref([])
    const loading = ref(false)
    const error = ref('')
    const searchQuery = ref('')
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
      name: ''
    })
    
    // Methods
    const loadEquipmentMakes = async () => {
      loading.value = true
      error.value = ''
      
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value
        }
        
        const response = await catalogsApi.getEquipmentMakes(params)
        
        if (response.success) {
          equipmentMakes.value = response.data
          Object.assign(pagination, response.pagination)
        } else {
          throw new Error(response.message || 'Failed to load equipment makes')
        }
      } catch (err) {
        console.error('Failed to load equipment makes:', err)
        error.value = err.userMessage || err.message || 'Failed to load equipment makes'
        equipmentMakes.value = []
      } finally {
        loading.value = false
      }
    }
    
    const goToPage = (page) => {
      pagination.page = page
      loadEquipmentMakes()
    }
    
    const editMake = (make) => {
      form.id = make.id
      form.name = make.name
      showEditModal.value = true
    }
    
    const deleteMake = async (make) => {
      const confirmed = await confirmDelete(make.name)
      if (!confirmed) return
      
      try {
        const response = await catalogsApi.deleteEquipmentMake(make.id)
        if (response.success) {
          success('Equipment make deleted successfully')
          loadEquipmentMakes()
        } else {
          throw new Error(response.message || 'Failed to delete equipment make')
        }
      } catch (err) {
        console.error('Failed to delete equipment make:', err)
        showError('Delete Failed', err.userMessage || err.message)
      }
    }
    
    const saveMake = async () => {
      saving.value = true
      
      try {
        // Validate that name is not empty after trimming
        const trimmedName = form.name.trim()
        if (!trimmedName) {
          showError('Validation Error', 'Name cannot be empty or contain only spaces')
          saving.value = false
          return
        }
        
        const data = {
          name: trimmedName
        }
        
        let response
        if (showEditModal.value) {
          response = await catalogsApi.updateEquipmentMake(form.id, data)
        } else {
          response = await catalogsApi.createEquipmentMake(data)
        }
        
        if (response.success) {
          success(`Equipment make ${showEditModal.value ? 'updated' : 'created'} successfully`)
          closeModal()
          loadEquipmentMakes()
        } else {
          throw new Error(response.message || 'Failed to save equipment make')
        }
      } catch (err) {
        console.error('Failed to save equipment make:', err)
        showError('Save Failed', err.userMessage || err.message)
      } finally {
        saving.value = false
      }
    }
    
    const closeModal = () => {
      showCreateModal.value = false
      showEditModal.value = false
      form.id = null
      form.name = ''
    }
    
    // formatDate is now imported from @/utils/formatters
    
    const handleSearch = () => {
      pagination.page = 1
      loadEquipmentMakes()
    }
    
    // Lifecycle
    onMounted(() => {
      loadEquipmentMakes()
    })
    
    return {
      equipmentMakes,
      loading,
      error,
      searchQuery,
      pagination,
      showCreateModal,
      showEditModal,
      saving,
      form,
      loadEquipmentMakes,
      handleSearch,
      goToPage,
      editMake,
      deleteMake,
      saveMake,
      closeModal,
      formatDate // imported from utils
    }
  }
}
</script>
