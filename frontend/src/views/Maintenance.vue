<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Maintenance Templates</h1>
        <p class="text-gray-600 mt-1">Manage equipment maintenance templates and schedules</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-4 px-6 border-b-2 font-medium text-sm flex items-center',
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <span v-html="tab.icon" class="w-5 h-5 mr-2"></span>
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <!-- Templates Tab -->
        <div v-if="activeTab === 'templates'">
          <!-- Search and Filters -->
          <div class="card mb-6">
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
                    <div>
                      <!-- Equipment Type -->
                      <h3 class="text-xl font-bold text-gray-900">
                        {{ template.equipment.type_name }}
                      </h3>

                      <!-- Make and Model -->
                      <div class="flex items-center space-x-2 mt-1">
                        <span v-if="template.equipment.make_name" class="text-base text-gray-700 font-medium">
                          {{ template.equipment.make_name }}
                        </span>
                        <span v-if="template.equipment.make_name && template.equipment.model_name" class="text-gray-400">•</span>
                        <span v-if="template.equipment.model_name" class="text-base text-gray-700">
                          {{ template.equipment.model_name }}
                        </span>
                      </div>

                      <!-- Additional Info -->
                      <div class="flex items-center space-x-3 mt-2">
                        <span v-if="template.equipment.year" class="text-sm text-gray-500">
                          Year: {{ template.equipment.year }}
                        </span>
                        <span v-if="template.equipment.year && template.equipment.trim_name" class="text-gray-300">|</span>
                        <span v-if="template.equipment.trim_name" class="text-sm text-gray-500">
                          {{ template.equipment.trim_name }}
                        </span>
                        <span v-if="(template.equipment.year || template.equipment.trim_name)" class="text-gray-300">|</span>
                        <span class="text-xs text-gray-400">
                          Created {{ formatDate(template.created_at) }}
                        </span>
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
        </div>

        <!-- Bulk Import Tab -->
        <div v-if="activeTab === 'import'">
          <MaintenanceBulkImportTab @import-complete="handleImportComplete" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { maintenanceApi } from '@/services/maintenanceApi'
import { catalogsApi } from '@/services/catalogsApi'
import SearchInput from '@/components/shared/SearchInput.vue'
import AutocompleteSelect from '@/components/shared/AutocompleteSelect.vue'
import PaginationBar from '@/components/shared/PaginationBar.vue'
import MaintenanceBulkImportTab from '@/components/maintenance/MaintenanceBulkImportTab.vue'

// State
const activeTab = ref('templates')
const templates = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const expandedTemplates = ref(new Set())

// Tabs configuration
const tabs = [
  {
    key: 'templates',
    label: 'Templates',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>'
  },
  {
    key: 'import',
    label: 'Bulk Import',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>'
  }
]

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
  // Reload templates to show newly imported ones
  loadTemplates()
  // Optionally switch back to templates tab to see the results
  // activeTab.value = 'templates'
}

// Lifecycle
onMounted(() => {
  loadTemplates()
})
</script>
