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


    <!-- Quick Actions -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-1">
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

<script setup>
import { ref, onMounted } from 'vue'
import { reportsApi } from '@/services/reportsApi'

const stats = ref({
  totalFarms: 0,
  totalEquipment: 0,
  maintenanceTemplates: 0,
  equipmentTypes: 0
})

const loadStats = async () => {
  try {
    const response = await reportsApi.getSystemStats()

    if (response.success) {
      stats.value = {
        totalFarms: response.data.farms?.total_count || 0,
        totalEquipment: response.data.equipment?.active_count || 0,
        maintenanceTemplates: response.data.maintenance_templates?.total_count || 0,
        equipmentTypes: response.data.catalog?.equipment_types_count || 0
      }

      console.log('Dashboard stats loaded:', stats.value)
    } else {
      throw new Error(response.message || 'Failed to load system stats')
    }
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
    // Keep fallback values at 0
    stats.value = {
      totalFarms: 0,
      totalEquipment: 0,
      maintenanceTemplates: 0,
      equipmentTypes: 0
    }
  }
}

onMounted(() => {
  loadStats()
})
</script>