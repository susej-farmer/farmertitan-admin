<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Farms Overview</h1>
        <p class="text-gray-600 mt-1">Manage farms and their operations</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Farm
      </button>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-1m-3 1l-3-1" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-900">Total Farms</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.total_farms || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-900">Active Farms</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.active_farms || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-900">Total Acres</p>
              <p class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.total_acres) || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-900">Avg. Acres</p>
              <p class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.average_acres) || 0 }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search farms..."
              class="form-input"
            />
          </div>
          <div>
            <select v-model="activeFilter" class="form-select">
              <option value="">All Farms</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
          <div>
            <button 
              @click="loadFarms"
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
      <p class="text-gray-600">Loading farms...</p>
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
        <button @click="loadFarms" class="btn btn-primary">
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
              <th class="table-header-cell">Farm Name</th>
              <th class="table-header-cell">Acres</th>
              <th class="table-header-cell">Equipment</th>
              <th class="table-header-cell">Users</th>
              <th class="table-header-cell">Status</th>
              <th class="table-header-cell">Created</th>
              <th class="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="farm in farms" :key="farm.id" class="table-row">
              <td class="table-cell font-medium">{{ farm.name }}</td>
              <td class="table-cell">{{ formatNumber(farm.acres) }}</td>
              <td class="table-cell">{{ farm.equipment_count || 0 }}</td>
              <td class="table-cell">{{ farm.user_count || 0 }}</td>
              <td class="table-cell">
                <span v-if="farm.active !== false" class="badge bg-green-100 text-green-800">Active</span>
                <span v-else class="badge bg-red-100 text-red-800">Inactive</span>
              </td>
              <td class="table-cell">{{ formatDate(farm.created_at) }}</td>
              <td class="table-cell">
                <div class="flex items-center space-x-2">
                  <router-link 
                    :to="{ name: 'FarmDetails', params: { id: farm.id } }"
                    class="btn btn-sm btn-secondary"
                  >
                    View
                  </router-link>
                  <button 
                    @click="editFarm(farm)"
                    class="btn btn-sm btn-secondary"
                  >
                    Edit
                  </button>
                  <button 
                    @click="deleteFarm(farm)"
                    class="btn btn-sm btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="farms.length === 0" class="table-row">
              <td colspan="7" class="table-cell text-center text-gray-500 py-8">
                No farms found
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
          <form @submit.prevent="saveFarm">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                {{ showEditModal ? 'Edit Farm' : 'Create New Farm' }}
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label class="form-label">Farm Name *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    class="form-input"
                    placeholder="Enter farm name"
                  />
                </div>
                
                <div>
                  <label class="form-label">Acres *</label>
                  <input
                    v-model.number="form.acres"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="form-input"
                    placeholder="Enter acres"
                  />
                </div>
                
                <div>
                  <label class="form-label">Status</label>
                  <select v-model="form.active" class="form-select">
                    <option :value="true">Active</option>
                    <option :value="false">Inactive</option>
                  </select>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { farmsApi } from '@/services/farmsApi'
import { useNotifications } from '@/composables/useNotifications'
import { useModals } from '@/composables/useModals'
import PaginationBar from '@/components/shared/PaginationBar.vue'

export default {
  name: 'FarmsOverview',
  components: {
    PaginationBar
  },
  setup() {
    const { success, error: showError } = useNotifications()
    const { confirmDelete } = useModals()
    
    // State
    const farms = ref([])
    const stats = ref({})
    const loading = ref(false)
    const error = ref('')
    const searchQuery = ref('')
    const activeFilter = ref('')
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
      acres: null,
      active: true
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
    const loadStats = async () => {
      try {
        const response = await farmsApi.getStatistics()
        if (response.success) {
          stats.value = response.data
        }
      } catch (err) {
        console.error('Failed to load farm statistics:', err)
      }
    }
    
    const loadFarms = async () => {
      loading.value = true
      error.value = ''
      
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value,
          active: activeFilter.value !== '' ? activeFilter.value : null
        }
        
        const response = await farmsApi.getFarms(params)
        
        if (response.success) {
          farms.value = response.data
          Object.assign(pagination, response.pagination)
        } else {
          throw new Error(response.message || 'Failed to load farms')
        }
      } catch (err) {
        console.error('Failed to load farms:', err)
        error.value = err.userMessage || err.message || 'Failed to load farms'
        farms.value = []
      } finally {
        loading.value = false
      }
    }
    
    const handlePaginationChange = (newPagination) => {
      pagination.page = newPagination.page
      pagination.limit = newPagination.limit
      loadFarms()
    }

    const goToPage = (page) => {
      pagination.page = page
      loadFarms()
    }
    
    const editFarm = (farm) => {
      form.id = farm.id
      form.name = farm.name
      form.acres = farm.acres
      form.active = farm.active !== false
      
      showEditModal.value = true
    }
    
    const deleteFarm = async (farm) => {
      const confirmed = await confirmDelete(farm.name)
      if (!confirmed) return
      
      try {
        const response = await farmsApi.deleteFarm(farm.id)
        if (response.success) {
          success('Farm deleted successfully')
          loadFarms()
          loadStats()
        } else {
          throw new Error(response.message || 'Failed to delete farm')
        }
      } catch (err) {
        console.error('Failed to delete farm:', err)
        showError('Delete Failed', err.userMessage || err.message)
      }
    }
    
    const saveFarm = async () => {
      saving.value = true
      
      try {
        const data = {
          name: form.name,
          acres: form.acres,
          active: form.active
        }
        
        let response
        if (showEditModal.value) {
          response = await farmsApi.updateFarm(form.id, data)
        } else {
          response = await farmsApi.createFarm(data)
        }
        
        if (response.success) {
          success(`Farm ${showEditModal.value ? 'updated' : 'created'} successfully`)
          closeModal()
          loadFarms()
          loadStats()
        } else {
          throw new Error(response.message || 'Failed to save farm')
        }
      } catch (err) {
        console.error('Failed to save farm:', err)
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
      form.acres = null
      form.active = true
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleDateString()
    }
    
    const formatNumber = (value) => {
      if (!value) return '0'
      return new Intl.NumberFormat().format(value)
    }
    
    // Watch for filter changes
    watch([activeFilter], () => {
      pagination.page = 1
      loadFarms()
    })
    
    // Lifecycle
    onMounted(() => {
      loadStats()
      loadFarms()
    })
    
    return {
      farms,
      stats,
      loading,
      error,
      searchQuery,
      activeFilter,
      pagination,
      paginationModel,
      showCreateModal,
      showEditModal,
      saving,
      form,
      loadFarms,
      handlePaginationChange,
      goToPage,
      editFarm,
      deleteFarm,
      saveFarm,
      closeModal,
      formatDate,
      formatNumber
    }
  }
}
</script>
