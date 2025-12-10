<template>
  <div class="space-y-6">
    <!-- Header with Search and Filters -->
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div class="flex-1 max-w-md">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name or serial number..."
            @input="debouncedSearch"
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div class="flex gap-3">
        <!-- Status Filter -->
        <select
          v-model="filters.status"
          @change="loadEquipment"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <!-- Equipment Type Filter -->
        <div class="w-64">
          <AutocompleteSelect
            v-model="filters.equipment_type"
            :fetch-options="fetchTypes"
            :initial-label="selectedTypeLabel"
            placeholder="Search types..."
            @change="handleTypeChange"
            @select="handleTypeSelect"
          />
        </div>

        <!-- Equipment Make Filter -->
        <div class="w-64">
          <AutocompleteSelect
            v-model="filters.equipment_make"
            :fetch-options="fetchMakes"
            :initial-label="selectedMakeLabel"
            placeholder="Search makes..."
            @change="handleMakeChange"
            @select="handleMakeSelect"
          />
        </div>

        <!-- Equipment Model Filter -->
        <div class="w-64">
          <AutocompleteSelect
            v-model="filters.equipment_model"
            :fetch-options="fetchModels"
            :initial-label="selectedModelLabel"
            :disabled="!filters.equipment_make"
            placeholder="Search models..."
            @change="handleModelChange"
            @select="handleModelSelect"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
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
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Equipment</h3>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button @click="loadEquipment" class="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!equipment.length" class="card">
      <div class="card-body text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m4.5 4.5V19.5a2.25 2.25 0 0 0 2.25 2.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-.75m-6 0a2.25 2.25 0 0 1-2.25-2.25v-.75m6 0V15a2.25 2.25 0 0 1 2.25-2.25h.75m-6 0a2.25 2.25 0 0 0-2.25 2.25v.75m6 0a2.25 2.25 0 0 0 2.25-2.25V15" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Equipment Found</h3>
        <p class="text-gray-600">
          {{ searchQuery ? 'Try adjusting your search or filters' : 'This farm has no equipment yet' }}
        </p>
      </div>
    </div>

    <!-- Equipment Table -->
    <div v-else class="card">
      <div class="overflow-x-auto">
        <table class="table min-w-full">
          <thead class="table-header">
            <tr>
              <th class="table-header-cell text-left">Name</th>
              <th class="table-header-cell text-left">Type</th>
              <th class="table-header-cell text-left">Make / Model</th>
              <th class="table-header-cell text-left">Serial Number</th>
              <th class="table-header-cell text-left">Status</th>
              <th class="table-header-cell text-left">Tasks</th>
              <th class="table-header-cell text-left">Created</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="item in equipment" :key="item.id" class="table-row hover:bg-gray-50">
              <td class="table-cell">
                <div>
                  <div class="font-medium text-gray-900">{{ item.name }}</div>
                  <div class="text-xs text-gray-500 font-mono">{{ item.id }}</div>
                </div>
              </td>
              <td class="table-cell">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ item._equipment?._equipment_type?.name || '-' }}
                </span>
              </td>
              <td class="table-cell text-sm text-gray-600">
                <div>{{ item._equipment?._equipment_make?.name || '-' }}</div>
                <div v-if="item._equipment?._equipment_model?.name" class="text-xs text-gray-500">
                  {{ item._equipment._equipment_model.name }}
                </div>
              </td>
              <td class="table-cell font-mono text-sm text-gray-900">
                {{ item.serial_number || '-' }}
              </td>
              <td class="table-cell">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(item.status)
                  ]"
                >
                  {{ formatStatus(item.status) }}
                </span>
              </td>
              <td class="table-cell">
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {{ item.maintenance_tasks?.count || 0 }}
                </div>
              </td>
              <td class="table-cell text-sm text-gray-600">
                {{ formatDate(item.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <PaginationBar
        v-model="paginationModel"
        :total-items="pagination.total"
        :total-pages="pagination.pages"
        @change="handlePaginationChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { farmsApi } from '@/services/farmsApi'
import { catalogsApi } from '@/services/catalogsApi'
import { useNotifications } from '@/composables/useNotifications'
import PaginationBar from '@/components/shared/PaginationBar.vue'
import AutocompleteSelect from '@/components/shared/AutocompleteSelect.vue'

const props = defineProps({
  farm: {
    type: Object,
    required: true
  }
})

const { error: showError } = useNotifications()

// State
const equipment = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const filters = ref({
  status: '',
  equipment_type: '',
  equipment_make: '',
  equipment_model: ''
})
const pagination = ref({
  page: 1,
  limit: 25,
  total: 0,
  pages: 0
})
const equipmentTypes = ref([])
const equipmentMakes = ref([])
const equipmentModels = ref([])

// Labels for autocomplete initial values
const selectedTypeLabel = ref('')
const selectedMakeLabel = ref('')
const selectedModelLabel = ref('')

// Debounce timer
let searchTimeout = null

// Computed
const paginationModel = computed({
  get: () => ({
    page: pagination.value.page,
    limit: pagination.value.limit
  }),
  set: (value) => {
    pagination.value.page = value.page
    pagination.value.limit = value.limit
  }
})

// Methods
const loadEquipment = async () => {
  if (!props.farm?.id) return

  loading.value = true
  error.value = ''

  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }

    // Add search query
    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    // Add filters
    if (filters.value.status) {
      params.status = filters.value.status
    }
    if (filters.value.equipment_type) {
      params.equipment_type = filters.value.equipment_type
    }
    if (filters.value.equipment_make) {
      params.equipment_make = filters.value.equipment_make
    }
    if (filters.value.equipment_model) {
      params.equipment_model = filters.value.equipment_model
    }

    const response = await farmsApi.getFarmEquipment(props.farm.id, params)

    if (response.success) {
      equipment.value = response.data
      pagination.value = {
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        pages: response.pagination.pages
      }
    } else {
      throw new Error(response.message || 'Failed to load equipment')
    }
  } catch (err) {
    console.error('Failed to load equipment:', err)
    error.value = err.userMessage || err.message || 'Failed to load equipment'
    showError('Error', error.value)
  } finally {
    loading.value = false
  }
}

const handlePaginationChange = (newPagination) => {
  pagination.value.page = newPagination.page
  pagination.value.limit = newPagination.limit
  loadEquipment()
}

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1 // Reset to first page on search
    loadEquipment()
  }, 500)
}

const changePage = (page) => {
  if (page < 1 || page > pagination.value.pages) return
  pagination.value.page = page
  loadEquipment()
}

const changePageSize = () => {
  pagination.value.page = 1 // Reset to first page when changing page size
  loadEquipment()
}

const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    retired: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const formatStatus = (status) => {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

// Fetch functions for AutocompleteSelect
const fetchTypes = async (searchQuery) => {
  try {
    const params = {
      search: searchQuery,
      limit: 20,
      sort: 'name',
      order: 'asc'
    }
    const response = await catalogsApi.getEquipmentTypes(params)
    return response.success ? response.data : []
  } catch (err) {
    console.error('Failed to fetch types:', err)
    return []
  }
}

const fetchMakes = async (searchQuery) => {
  try {
    const params = {
      search: searchQuery,
      limit: 20,
      sort: 'name',
      order: 'asc'
    }
    const response = await catalogsApi.getEquipmentMakes(params)
    return response.success ? response.data : []
  } catch (err) {
    console.error('Failed to fetch makes:', err)
    return []
  }
}

const fetchModels = async (searchQuery) => {
  try {
    const params = {
      search: searchQuery,
      limit: 20,
      sort: 'name',
      order: 'asc'
    }

    // Filter by selected make if exists
    if (filters.value.equipment_make) {
      params.equipment_make_id = filters.value.equipment_make
    }

    const response = await catalogsApi.getEquipmentModels(params)
    return response.success ? response.data : []
  } catch (err) {
    console.error('Failed to fetch models:', err)
    return []
  }
}

// Select handlers for autocomplete (receive full object)
const handleTypeSelect = (option) => {
  if (option) {
    selectedTypeLabel.value = option.name
  } else {
    selectedTypeLabel.value = ''
  }
}

const handleMakeSelect = (option) => {
  if (option) {
    selectedMakeLabel.value = option.name
  } else {
    selectedMakeLabel.value = ''
  }
}

const handleModelSelect = (option) => {
  if (option) {
    selectedModelLabel.value = option.name
  } else {
    selectedModelLabel.value = ''
  }
}

// Change handlers for autocomplete (receive ID value)
const handleTypeChange = (value) => {
  filters.value.equipment_type = value
  if (!value) {
    selectedTypeLabel.value = ''
  }
  pagination.value.page = 1
  loadEquipment()
}

const handleMakeChange = (value) => {
  filters.value.equipment_make = value

  // Clear model selection when make changes
  if (!value) {
    selectedMakeLabel.value = ''
    filters.value.equipment_model = ''
    selectedModelLabel.value = ''
  }

  pagination.value.page = 1
  loadEquipment()
}

const handleModelChange = (value) => {
  filters.value.equipment_model = value
  if (!value) {
    selectedModelLabel.value = ''
  }
  pagination.value.page = 1
  loadEquipment()
}

// Watch for farm changes
watch(() => props.farm?.id, (newId) => {
  if (newId) {
    loadEquipment()
  }
})

// Lifecycle
onMounted(() => {
  loadEquipment()
})
</script>
