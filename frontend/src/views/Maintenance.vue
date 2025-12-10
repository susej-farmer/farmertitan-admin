<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Maintenance Templates</h1>
        <p class="text-gray-600 mt-1">Manage equipment maintenance templates and schedules</p>
      </div>
      <button @click="showBulkImportModal = true" class="btn btn-primary flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Bulk Import
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="card">
      <div class="card-body">
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <SearchInput
              v-model="searchQuery"
              placeholder="Search templates..."
              @search="handleSearch"
              @clear="handleSearch"
            />
          </div>
          <div class="w-64">
            <AutocompleteSelect
              v-model="filters.equipment_type_id"
              :fetch-options="fetchTypes"
              :initial-label="selectedTypeLabel"
              placeholder="Search types..."
              @change="handleTypeChange"
              @select="handleTypeSelect"
            />
          </div>
          <div class="w-64">
            <AutocompleteSelect
              v-model="filters.equipment_make_id"
              :fetch-options="fetchMakes"
              :initial-label="selectedMakeLabel"
              placeholder="Search makes..."
              @change="handleMakeChange"
              @select="handleMakeSelect"
            />
          </div>
          <div class="w-64">
            <AutocompleteSelect
              v-model="filters.equipment_model_id"
              :fetch-options="fetchModels"
              :initial-label="selectedModelLabel"
              :disabled="!filters.equipment_make_id"
              placeholder="Search models..."
              @change="handleModelChange"
              @select="handleModelSelect"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
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
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Templates</h3>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button @click="loadTemplates" class="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="templates.length === 0" class="card">
      <div class="card-body text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
        <p class="text-gray-600">
          {{ searchQuery || Object.values(filters).some(v => v) ? 'Try adjusting your filters' : 'No maintenance templates have been created yet' }}
        </p>
      </div>
    </div>

    <!-- Templates Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="template in templates"
        :key="template.id"
        class="card hover:shadow-lg transition-shadow duration-200"
      >
        <div class="card-body">
          <!-- Header: Equipment Info -->
          <div class="flex items-start justify-between">
            <!-- Left: Equipment Identity -->
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <!-- Equipment Icon -->
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m4.5 4.5V19.5a2.25 2.25 0 0 0 2.25 2.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-.75m-6 0a2.25 2.25 0 0 1-2.25-2.25v-.75m6 0V15a2.25 2.25 0 0 1 2.25-2.25h.75m-6 0a2.25 2.25 0 0 0-2.25 2.25v.75m6 0a2.25 2.25 0 0 0 2.25-2.25V15" />
                    </svg>
                  </div>
                </div>

                <!-- Equipment Details -->
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ getEquipmentDisplayName(template.equipment) }}
                  </h3>
                  <p v-if="getEquipmentSubtitle(template.equipment)" class="text-sm text-gray-500 mt-0.5">
                    {{ getEquipmentSubtitle(template.equipment) }}
                  </p>
                  <div class="flex items-center space-x-2 mt-1">
                    <span class="text-xs text-gray-400">
                      Created {{ formatDate(template.created_at) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Task Count & Actions -->
            <div class="flex items-center space-x-4">
              <!-- Task Count Badge -->
              <div class="text-right">
                <p class="text-xs text-gray-500 font-medium">Tasks</p>
                <div class="flex items-center space-x-2 mt-1">
                  <span :class="getTaskCountBadgeClass(template.task_count)" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold">
                    {{ template.task_count }}
                  </span>
                </div>
              </div>

              <!-- View Tasks Button -->
              <button
                @click="toggleExpand(template.id)"
                class="btn btn-secondary flex items-center space-x-2"
              >
                <span>{{ expandedTemplates.has(template.id) ? 'Hide' : 'View' }} Tasks</span>
                <svg
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedTemplates.has(template.id) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Actions Menu -->
              <div class="relative">
                <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Expandible: Tasks List -->
          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div v-if="expandedTemplates.has(template.id)" class="mt-6 pt-6 border-t border-gray-200">
              <h4 class="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <svg class="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Maintenance Tasks ({{ template.task_count }})
              </h4>

              <div class="space-y-2">
                <div
                  v-for="task in template.tasks"
                  :key="task.id"
                  class="flex items-center justify-between py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div class="flex items-start space-x-3 flex-1">
                    <!-- Task Check Icon -->
                    <div class="flex-shrink-0 mt-0.5">
                      <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    <!-- Task Details -->
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900">
                        {{ task.name }}
                      </p>
                      <p v-if="task.description" class="text-xs text-gray-500 mt-1">
                        {{ task.description }}
                      </p>
                    </div>
                  </div>

                  <!-- Intervals -->
                  <div class="flex items-center space-x-4 ml-4">
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="(interval, index) in task.intervals"
                        :key="index"
                        class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {{ formatInterval(interval) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <PaginationBar
      v-if="templates.length > 0"
      v-model="paginationModel"
      :total-items="pagination.total"
      :total-pages="pagination.totalPages"
      @change="handlePaginationChange"
    />

    <!-- Bulk Import Modal -->
    <BulkImportModal
      :is-open="showBulkImportModal"
      @close="showBulkImportModal = false"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { maintenanceApi } from '@/services/maintenanceApi'
import { catalogsApi } from '@/services/catalogsApi'
import SearchInput from '@/components/shared/SearchInput.vue'
import AutocompleteSelect from '@/components/shared/AutocompleteSelect.vue'
import PaginationBar from '@/components/shared/PaginationBar.vue'
import BulkImportModal from '@/components/maintenance/BulkImportModal.vue'

// State
const showBulkImportModal = ref(false)
const templates = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const expandedTemplates = ref(new Set())

// Labels for autocomplete
const selectedTypeLabel = ref('')
const selectedMakeLabel = ref('')
const selectedModelLabel = ref('')

// Filters
const filters = reactive({
  equipment_type_id: '',
  equipment_make_id: '',
  equipment_model_id: ''
})

// Pagination
const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

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

    if (filters.equipment_make_id) {
      params.equipment_make_id = filters.equipment_make_id
    }

    const response = await catalogsApi.getEquipmentModels(params)
    return response.success ? response.data : []
  } catch (err) {
    console.error('Failed to fetch models:', err)
    return []
  }
}

// Select handlers
const handleTypeSelect = (option) => {
  selectedTypeLabel.value = option ? option.name : ''
}

const handleMakeSelect = (option) => {
  selectedMakeLabel.value = option ? option.name : ''
}

const handleModelSelect = (option) => {
  selectedModelLabel.value = option ? option.name : ''
}

// Change handlers
const handleTypeChange = (value) => {
  filters.equipment_type_id = value
  if (!value) selectedTypeLabel.value = ''
  pagination.page = 1
  loadTemplates()
}

const handleMakeChange = (value) => {
  filters.equipment_make_id = value
  if (!value) {
    selectedMakeLabel.value = ''
    filters.equipment_model_id = ''
    selectedModelLabel.value = ''
  }
  pagination.page = 1
  loadTemplates()
}

const handleModelChange = (value) => {
  filters.equipment_model_id = value
  if (!value) selectedModelLabel.value = ''
  pagination.page = 1
  loadTemplates()
}

const handleSearch = () => {
  pagination.page = 1
  loadTemplates()
}

const handlePaginationChange = (newPagination) => {
  pagination.page = newPagination.page
  pagination.limit = newPagination.limit
  loadTemplates()
}

// Load templates
const loadTemplates = async () => {
  loading.value = true
  error.value = ''

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sort: 'type_name',
      order: 'asc'
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    if (filters.equipment_type_id) {
      params.type_id = filters.equipment_type_id
    }
    if (filters.equipment_make_id) {
      params.make_id = filters.equipment_make_id
    }
    if (filters.equipment_model_id) {
      params.model_id = filters.equipment_model_id
    }

    const response = await maintenanceApi.getMaintenanceTemplates(params)

    if (response.success) {
      templates.value = response.data
      pagination.total = response.pagination?.total || 0
      pagination.totalPages = response.pagination?.total_pages || 0
    } else {
      throw new Error(response.message || 'Failed to load templates')
    }
  } catch (err) {
    console.error('Failed to load templates:', err)
    error.value = err.userMessage || err.message || 'Failed to load maintenance templates'
    templates.value = []
  } finally {
    loading.value = false
  }
}

// Toggle expand/collapse
const toggleExpand = (templateId) => {
  if (expandedTemplates.value.has(templateId)) {
    expandedTemplates.value.delete(templateId)
  } else {
    expandedTemplates.value.add(templateId)
  }
}

// Helper functions
const getEquipmentDisplayName = (equipment) => {
  const parts = [equipment.type_name]

  if (equipment.make_name) {
    parts.push('-', equipment.make_name)
  }
  if (equipment.model_name) {
    parts.push(equipment.model_name)
  }

  return parts.join(' ')
}

const getEquipmentSubtitle = (equipment) => {
  const parts = []

  if (equipment.year) {
    parts.push(equipment.year)
  }
  if (equipment.trim_name) {
    parts.push(equipment.trim_name)
  }

  return parts.length > 0 ? parts.join(' • ') : null
}

const formatInterval = (interval) => {
  const unitMap = {
    hours: 'hrs',
    km: 'km',
    miles: 'mi',
    months: 'mo',
    years: 'yr'
  }

  return `${interval.value} ${unitMap[interval.unit] || interval.unit}`
}

const getTaskCountBadgeClass = (count) => {
  if (count === 0) {
    return 'bg-red-100 text-red-800'
  } else if (count <= 5) {
    return 'bg-yellow-100 text-yellow-800'
  } else if (count <= 10) {
    return 'bg-blue-100 text-blue-800'
  } else {
    return 'bg-emerald-100 text-emerald-800'
  }
}

const getPriorityClass = (priority) => {
  const classes = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800'
  }
  return classes[priority] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return date.toLocaleDateString()
}

// Bulk Import Handler
const handleImportComplete = () => {
  showBulkImportModal.value = false
  loadTemplates() // Reload templates to show newly imported ones
}

// Lifecycle
onMounted(() => {
  loadTemplates()
})
</script>
