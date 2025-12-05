<template>
  <div class="space-y-6">
    <!-- Search -->
    <div class="card">
      <div class="card-body">
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search consumable types..."
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
            Add Consumable Type
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="loading-spinner w-8 h-8 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading consumable types...</p>
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
        <button @click="loadConsumableTypes" class="btn btn-primary">
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
              <th class="table-header-cell">ID</th>
              <th class="table-header-cell">Name</th>
              <th class="table-header-cell">Description</th>
              <th class="table-header-cell">Created By</th>
              <th class="table-header-cell">Created In</th>
              <th class="table-header-cell">Created</th>
              <th class="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="consumableType in consumableTypes" :key="consumableType.id" class="table-row">
              <td class="table-cell">{{ consumableType.id }}</td>
              <td class="table-cell font-medium">{{ consumableType.name }}</td>
              <td class="table-cell">{{ consumableType.description || '-' }}</td>
              <td class="table-cell">{{ consumableType.created_by_name || '-' }}</td>
              <td class="table-cell">{{ consumableType.created_in_name || '-' }}</td>
              <td class="table-cell">{{ formatDate(consumableType.created_at) }}</td>
              <td class="table-cell">
                <div class="flex items-center space-x-2">
                  <button 
                    @click="editConsumableType(consumableType)"
                    class="btn btn-sm btn-secondary"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button 
                    @click="deleteConsumableType(consumableType)"
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
            <tr v-if="consumableTypes.length === 0" class="table-row">
              <td colspan="7" class="table-cell text-center text-gray-500 py-8">
                No consumable types found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <PaginationBar
        v-model="paginationModel"
        :total-items="pagination.total"
        :total-pages="pagination.totalPages"
        @change="handlePaginationChange"
      />
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" @click="closeModal">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form @submit.prevent="saveConsumableType">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                {{ showEditModal ? 'Edit Consumable Type' : 'Create Consumable Type' }}
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label class="form-label">Name *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    class="form-input"
                    placeholder="Enter consumable type name"
                  />
                </div>
                
                <div>
                  <label class="form-label">Description</label>
                  <textarea
                    v-model="form.description"
                    class="form-input"
                    rows="3"
                    placeholder="Enter consumable type description (optional)"
                  ></textarea>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { catalogsApi } from '@/services/catalogsApi'
import { useNotifications } from '@/composables/useNotifications'
import { useModals } from '@/composables/useModals'
import { formatDate } from '@/utils/formatters'
import PaginationBar from '@/components/shared/PaginationBar.vue'

export default {
  name: 'ConsumableTypes',
  components: {
    PaginationBar
  },
  setup() {
    const { success, error: showError } = useNotifications()
    const { confirmDelete } = useModals()
    
    // State
    const consumableTypes = ref([])
    const loading = ref(false)
    const error = ref('')
    const searchQuery = ref('')
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const saving = ref(false)
    
    const pagination = reactive({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    })
    
    const form = reactive({
      id: null,
      name: '',
      description: ''
    })

    // Computed
    const paginationModel = computed({
      get: () => ({
        page: pagination.page,
        limit: pagination.limit
      }),
      set: (value) => {
        pagination.page = value.page
        pagination.limit = value.limit
      }
    })

    // Methods
    const loadConsumableTypes = async () => {
      loading.value = true
      error.value = ''

      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value,
          sort: 'name',
          order: 'asc'
        }

        const response = await catalogsApi.getConsumableTypes(params)
        
        if (response.success) {
          consumableTypes.value = response.data
          Object.assign(pagination, response.pagination)
        } else {
          throw new Error(response.message || 'Failed to load consumable types')
        }
      } catch (err) {
        console.error('Failed to load consumable types:', err)
        error.value = err.userMessage || err.message || 'Failed to load consumable types'
        consumableTypes.value = []
      } finally {
        loading.value = false
      }
    }
    
    const handlePaginationChange = (newPagination) => {
      pagination.page = newPagination.page
      pagination.limit = newPagination.limit
      loadConsumableTypes()
    }
    
    const editConsumableType = (consumableType) => {
      form.id = consumableType.id
      form.name = consumableType.name
      form.description = consumableType.description || ''
      showEditModal.value = true
    }
    
    const deleteConsumableType = async (consumableType) => {
      const confirmed = await confirmDelete(consumableType.name)
      if (!confirmed) return
      
      try {
        const response = await catalogsApi.deleteConsumableType(consumableType.id)
        if (response.success) {
          success('Consumable type deleted successfully')
          loadConsumableTypes()
        } else {
          throw new Error(response.message || 'Failed to delete consumable type')
        }
      } catch (err) {
        console.error('Failed to delete consumable type:', err)
        showError('Delete Failed', err.userMessage || err.message)
      }
    }
    
    const saveConsumableType = async () => {
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
          name: trimmedName,
          description: form.description.trim() || null
        }
        
        let response
        if (showEditModal.value) {
          response = await catalogsApi.updateConsumableType(form.id, data)
        } else {
          response = await catalogsApi.createConsumableType(data)
        }
        
        if (response.success) {
          success(`Consumable type ${showEditModal.value ? 'updated' : 'created'} successfully`)
          closeModal()
          loadConsumableTypes()
        } else {
          throw new Error(response.message || 'Failed to save consumable type')
        }
      } catch (err) {
        console.error('Failed to save consumable type:', err)
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
      form.description = ''
    }
    
    // formatDate is now imported from @/utils/formatters
    
    const handleSearch = () => {
      pagination.page = 1
      loadConsumableTypes()
    }
    
    // Lifecycle
    onMounted(() => {
      loadConsumableTypes()
    })
    
    return {
      consumableTypes,
      loading,
      error,
      searchQuery,
      pagination,
      paginationModel,
      showCreateModal,
      showEditModal,
      saving,
      form,
      loadConsumableTypes,
      handleSearch,
      handlePaginationChange,
      editConsumableType,
      deleteConsumableType,
      saveConsumableType,
      closeModal,
      formatDate // imported from utils
    }
  }
}
</script>
