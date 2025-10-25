<template>
  <div class="qr-codes-view">
    <!-- Tabs -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-2 px-4 border-b-2 font-medium text-sm',
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <!-- QR Inventory Tab -->
        <div v-if="activeTab === 'inventory'" class="space-y-6">
          <QRInventory />
        </div>

        <!-- Production Batches Tab -->
        <div v-if="activeTab === 'batches'" class="space-y-6">
          <ProductionBatches />
        </div>

        <!-- Delivery Requests Tab -->
        <div v-if="activeTab === 'deliveries'" class="space-y-6">
          <DeliveryRequests />
        </div>

        <!-- QR Registry Tab -->
        <div v-if="activeTab === 'registry'" class="space-y-6">
          <QRRegistry />
        </div>

        <!-- Analytics Tab -->
        <div v-if="activeTab === 'analytics'" class="space-y-6">
          <QRAnalytics />
        </div>
      </div>
    </div>

    <!-- Production Batch Modal -->
    <ProductionBatchModal
      v-if="showBatchModal"
      @close="showBatchModal = false"
      @created="onBatchCreated"
    />

    <!-- Scan QR Modal -->
    <ScanQRModal
      v-if="showScanModal"
      @close="showScanModal = false"
      @scanned="onQRScanned"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QRInventory from '@/components/qr/QRInventory.vue'
import ProductionBatches from '@/components/qr/ProductionBatches.vue'
import DeliveryRequests from '@/components/qr/DeliveryRequests.vue'
import QRRegistry from '@/components/qr/QRRegistry.vue'
import QRAnalytics from '@/components/qr/QRAnalytics.vue'

// State
const activeTab = ref('inventory')

// Tabs configuration
const tabs = [
  { key: 'inventory', label: 'QR Inventory' },
  { key: 'batches', label: 'Production Batches' },
  { key: 'deliveries', label: 'Delivery Requests' },
  { key: 'registry', label: 'QR Registry' },
  { key: 'analytics', label: 'Analytics' }
]

// Event handlers

const onBatchCreated = (batchData) => {
  console.log('Batch Created:', batchData)
  // Switch to batches tab and refresh
  activeTab.value = 'batches'
  refreshCurrentTab()
}

const onQRScanned = (scanData) => {
  console.log('QR Scanned:', scanData)
  // Handle scan result
  refreshCurrentTab()
}

const refreshCurrentTab = () => {
  // Emit refresh event to active component
  // This will be handled by each component individually
}

// Initialize
onMounted(() => {
  // Load initial data
})
</script>

<style scoped>
.qr-codes-view {
  @apply max-w-7xl mx-auto;
}
</style>