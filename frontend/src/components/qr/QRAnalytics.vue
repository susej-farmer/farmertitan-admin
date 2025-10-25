<template>
  <div class="qr-analytics">
    <!-- Header -->
    <div class="mb-6">
      <h3 class="text-lg font-medium text-gray-900">QR Analytics</h3>
      <p class="text-sm text-gray-500">Usage statistics and performance insights</p>
    </div>

    <!-- Date range selector -->
    <div class="mb-6">
      <div class="flex items-center space-x-4">
        <label class="text-sm font-medium text-gray-700">Time Period:</label>
        <select v-model="selectedPeriod" @change="loadAnalytics" class="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>
    </div>

    <!-- Key metrics -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Generated</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-gray-900">{{ analytics.totalGenerated }}</div>
                  <div class="ml-2 flex items-baseline text-sm font-semibold text-emerald-600">
                    <svg class="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                    +{{ analytics.generatedGrowth }}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Bound to Assets</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-gray-900">{{ analytics.totalBound }}</div>
                  <div class="ml-2 text-sm text-gray-500">
                    {{ Math.round((analytics.totalBound / analytics.totalGenerated) * 100) }}% bound
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Scans Today</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-gray-900">{{ analytics.scansToday }}</div>
                  <div class="ml-2 flex items-baseline text-sm font-semibold text-yellow-600">
                    <svg class="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                    +{{ analytics.scansGrowth }}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Active Farms</dt>
                <dd class="text-2xl font-semibold text-gray-900">{{ analytics.activeFarms }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
      <!-- Usage trends chart -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-6">
          <h4 class="text-lg font-medium text-gray-900 mb-4">QR Usage Trends</h4>
          <div class="h-64 flex items-center justify-center bg-gray-50 rounded">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p class="mt-2 text-sm text-gray-500">Chart visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset distribution chart -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-6">
          <h4 class="text-lg font-medium text-gray-900 mb-4">Asset Type Distribution</h4>
          <div class="space-y-4">
            <div v-for="item in analytics.assetDistribution" :key="item.type" class="flex items-center">
              <div class="flex-1">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-gray-900 capitalize">{{ item.type }}</span>
                  <span class="text-gray-500">{{ item.count }} ({{ item.percentage }}%)</span>
                </div>
                <div class="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: item.percentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent activity -->
    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h4 class="text-lg font-medium text-gray-900 mb-4">Recent QR Activity</h4>
        <div class="flow-root">
          <ul class="-mb-8">
            <li v-for="(activity, idx) in analytics.recentActivity" :key="activity.id" class="relative pb-8">
              <div v-if="idx !== analytics.recentActivity.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
              <div class="relative flex space-x-3">
                <div>
                  <span :class="getActivityIconClass(activity.type)" class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                    <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path v-if="activity.type === 'generated'" fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                      <path v-else-if="activity.type === 'bound'" fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd" />
                      <path v-else fill-rule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </div>
                <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p class="text-sm text-gray-500">
                      {{ activity.description }}
                    </p>
                  </div>
                  <div class="text-right text-sm whitespace-nowrap text-gray-500">
                    {{ formatTimeAgo(activity.timestamp) }}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// State
const selectedPeriod = ref('30d')
const analytics = ref({
  totalGenerated: 0,
  totalBound: 0,
  scansToday: 0,
  activeFarms: 0,
  generatedGrowth: 0,
  scansGrowth: 0,
  assetDistribution: [],
  recentActivity: []
})

// Methods
const loadAnalytics = () => {
  // Mock analytics data
  analytics.value = {
    totalGenerated: 1247,
    totalBound: 856,
    scansToday: 342,
    activeFarms: 12,
    generatedGrowth: 15.3,
    scansGrowth: 8.7,
    assetDistribution: [
      { type: 'equipment', count: 456, percentage: 53 },
      { type: 'parts', count: 278, percentage: 32 },
      { type: 'consumables', count: 122, percentage: 15 }
    ],
    recentActivity: [
      {
        id: 1,
        type: 'generated',
        description: 'Generated 100 QR codes for production batch PRINT-2024-045',
        timestamp: '2024-01-15T14:30:00Z'
      },
      {
        id: 2,
        type: 'bound',
        description: 'QR code FT-ABC123 bound to John Deere Tractor at Green Valley Farm',
        timestamp: '2024-01-15T12:15:00Z'
      },
      {
        id: 3,
        type: 'scanned',
        description: 'QR code FT-DEF456 scanned by user at Sunset Acres',
        timestamp: '2024-01-15T10:45:00Z'
      },
      {
        id: 4,
        type: 'allocated',
        description: '250 QR codes allocated to Mountain View Ranch for delivery',
        timestamp: '2024-01-15T09:20:00Z'
      }
    ]
  }
}

const getActivityIconClass = (type) => {
  const classes = {
    generated: 'bg-emerald-500',
    bound: 'bg-blue-500',
    scanned: 'bg-yellow-500',
    allocated: 'bg-purple-500'
  }
  return classes[type] || 'bg-gray-500'
}

const formatTimeAgo = (timestamp) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInHours = Math.floor((now - time) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

// Initialize
onMounted(() => {
  loadAnalytics()
})
</script>