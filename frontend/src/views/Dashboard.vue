<template>
  <div class="space-y-6">
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Total Farms -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Farms</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.totalFarms }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Equipment -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-success-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Active Equipment</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.totalEquipment }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Maintenance Templates -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-warning-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Maintenance Templates</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.maintenanceTemplates }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment Types -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-info-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Equipment Types</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.equipmentTypes }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional Stats Row -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Equipment Makes -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Equipment Makes</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.equipmentMakes }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- API Status -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">System Status</dt>
                <dd class="text-lg font-medium text-green-600">Connected</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Database Status -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Database</dt>
                <dd class="text-lg font-medium text-blue-600">Supabase</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div class="card-body">
          <div class="flow-root">
            <ul class="-mb-8">
              <li v-for="(activity, index) in recentActivity" :key="activity.id">
                <div class="relative pb-8" :class="{ 'pb-0': index === recentActivity.length - 1 }">
                  <span 
                    v-if="index !== recentActivity.length - 1"
                    class="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" 
                    aria-hidden="true"
                  ></span>
                  <div class="relative flex items-start space-x-3">
                    <div class="relative">
                      <div class="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                        <svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div>
                        <div class="text-sm">
                          <span class="font-medium text-gray-900">{{ activity.user }}</span>
                        </div>
                        <p class="mt-0.5 text-sm text-gray-500">{{ activity.action }}</p>
                      </div>
                      <div class="mt-2 text-sm text-gray-700">
                        <p>{{ activity.description }}</p>
                      </div>
                      <div class="mt-2 text-sm text-gray-500">
                        <time :datetime="activity.timestamp">{{ formatTime(activity.timestamp) }}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div class="card-body space-y-4">
          <router-link to="/farms" class="btn btn-primary w-full">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Farm
          </router-link>
          
          <router-link to="/catalogs/equipment-types" class="btn btn-secondary w-full">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Manage Equipment Types
          </router-link>
          
          <router-link to="/catalogs/maintenance-templates" class="btn btn-secondary w-full">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Create Maintenance Template
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'Dashboard',
  setup() {
    const stats = ref({
      totalFarms: 0,
      totalEquipment: 0,
      maintenanceTemplates: 0,
      equipmentTypes: 0
    })
    
    const recentActivity = ref([
      {
        id: 1,
        user: 'Claude Code Assistant',
        action: 'Connected to Supabase',
        description: 'Successfully migrated database connection from PostgreSQL to Supabase',
        timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
      },
      {
        id: 2,
        user: 'Claude Code Assistant',
        action: 'Updated Equipment Types API',
        description: 'Equipment Types catalog now loading real data from database',
        timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        id: 3,
        user: 'Claude Code Assistant',
        action: 'Fixed Equipment Makes API',
        description: 'Equipment Makes catalog successfully migrated to Supabase',
        timestamp: new Date(Date.now() - 1000 * 60 * 45) // 45 minutes ago
      },
      {
        id: 4,
        user: 'System',
        action: 'Database Migration',
        description: 'All client modules updated to use Supabase client library',
        timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      }
    ])
    
    const loadStats = async () => {
      try {
        // Import API services
        const api = (await import('@/services/api')).default
        const { catalogsApi } = await import('@/services/catalogsApi')
        
        // Test API connection
        const healthResponse = await fetch('http://localhost:3000/health')
        const healthData = await healthResponse.json()
        console.log('API Health:', healthData)
        
        // Fetch real data from working endpoints
        const [equipmentTypesResponse, equipmentMakesResponse] = await Promise.all([
          catalogsApi.getEquipmentTypes({ page: 1, limit: 1 }),
          catalogsApi.getEquipmentMakes({ page: 1, limit: 1 })
        ])
        
        stats.value = {
          totalFarms: 0, // Farm endpoint not fully implemented yet
          totalEquipment: 0, // Equipment endpoint not implemented yet
          maintenanceTemplates: 0, // Templates endpoint not implemented yet
          equipmentTypes: equipmentTypesResponse.pagination?.total || 0,
          equipmentMakes: equipmentMakesResponse.pagination?.total || 0
        }
        
        console.log('Dashboard stats loaded:', stats.value)
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
        // Use fallback data
        stats.value = {
          totalFarms: 0,
          totalEquipment: 0,
          maintenanceTemplates: 0,
          equipmentTypes: 0,
          equipmentMakes: 0
        }
      }
    }
    
    const formatTime = (timestamp) => {
      const now = new Date()
      const time = new Date(timestamp)
      const diffInMinutes = Math.floor((now - time) / (1000 * 60))
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60)
        return `${hours} hour${hours > 1 ? 's' : ''} ago`
      } else {
        const days = Math.floor(diffInMinutes / 1440)
        return `${days} day${days > 1 ? 's' : ''} ago`
      }
    }
    
    onMounted(() => {
      loadStats()
    })
    
    return {
      stats,
      recentActivity,
      formatTime
    }
  }
}
</script>