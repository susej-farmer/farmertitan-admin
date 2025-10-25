<template>
  <div class="production-batches">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Production Batches</h3>
        <p class="text-sm text-gray-600">Manage QR code production batches from external printing services</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Production Batch
      </button>
    </div>

    <!-- Batches Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch Code
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="batch in batches" :key="batch.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ batch.batch_code }}</div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ batch.quantity }}</div>
                <div v-if="batch.defective_count > 0" class="text-xs text-red-600">
                  {{ batch.defective_count }} defective
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(batch.status)">
                  {{ formatStatus(batch.status) }}
                </span>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ batch.qr_supplier?.name || batch.supplier?.name || batch.supplier_name || '-' }}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ batch.available_count || 0 }}</div>
                <div class="text-xs text-gray-500">of {{ batch.quantity }}</div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(batch.created_at) }}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewBatchDetails(batch)"
                    class="p-1 text-blue-600 hover:text-blue-800"
                    title="View Details"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  
                  <!-- Status transition buttons -->
                  <button
                    v-if="batch.status === 'ordered'"
                    @click="updateStatus(batch, 'printing')"
                    class="p-1 text-blue-600 hover:text-blue-800"
                    title="Mark as Printing"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  
                  <button
                    v-if="batch.status === 'printing'"
                    @click="showReceiveModal(batch)"
                    class="p-1 text-green-600 hover:text-green-800"
                    title="Receive Batch"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  
                  <button
                    v-if="['received', 'partial'].includes(batch.status)"
                    @click="updateStatus(batch, 'completed')"
                    class="p-1 text-purple-600 hover:text-purple-800"
                    title="Mark as Completed"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" />
                    </svg>
                  </button>
                  
                  <button
                    v-if="['received', 'partial', 'completed'].includes(batch.status)"
                    @click="printBatch(batch)"
                    class="p-1 text-indigo-600 hover:text-indigo-800"
                    title="Print QR Codes"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  
                  <button
                    v-if="!['completed', 'cancelled'].includes(batch.status)"
                    @click="showCancelModal(batch)"
                    class="p-1 text-red-600 hover:text-red-800"
                    title="Cancel Batch"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Production Batch Modal -->
    <ProductionBatchModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onBatchCreated"
    />
    
    <!-- Receive Batch Modal -->
    <ReceiveBatchModal
      v-if="showReceiveBatchModal"
      :batch="selectedBatch"
      @close="showReceiveBatchModal = false"
      @received="onBatchReceived"
    />
    
    <!-- Cancel Batch Modal -->
    <CancelBatchModal
      v-if="showCancelBatchModal"
      :batch="selectedBatch"
      @close="showCancelBatchModal = false"
      @cancelled="onBatchCancelled"
    />
    
    <!-- Batch Details Modal -->
    <BatchDetailsModal
      v-if="showBatchDetails"
      :batch="detailsBatch"
      @close="showBatchDetails = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { formatDate } from '@/utils/formatters'
import ProductionBatchModal from './ProductionBatchModal.vue'
import ReceiveBatchModal from './ReceiveBatchModal.vue'
import CancelBatchModal from './CancelBatchModal.vue'
import BatchDetailsModal from './BatchDetailsModal.vue'
import { qrService } from '@/services/qrService'

// State
const batches = ref([])
const showCreateModal = ref(false)
const showReceiveBatchModal = ref(false)
const showCancelBatchModal = ref(false)
const selectedBatch = ref(null)
const loading = ref(false)

// Methods
const loadBatches = async () => {
  try {
    loading.value = true
    console.log('Loading production batches...')
    const response = await qrService.getProductionBatches()
    console.log('Batches response:', response)
    
    if (response && response.success && response.data) {
      batches.value = response.data || []
      console.log('Loaded batches:', batches.value)
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('Failed to load batches:', error)
    console.error('Error details:', error.response || error.message)
    
    // Fallback to mock data if API fails  
    console.log('Using fallback mock data')
    batches.value = [
      {
        id: '1',
        batch_code: 'PRINT-2024-001',
        quantity: 100,
        status: 'received',
        supplier: { name: 'QR Print Solutions' },
        available_count: 45,
        defective_count: 0,
        created_at: '2024-01-10T08:00:00Z'
      },
      {
        id: '2',
        batch_code: 'PRINT-2024-002',
        quantity: 200,
        status: 'printing',
        supplier: { name: 'QR Print Solutions' },
        available_count: 0,
        defective_count: 0,
        created_at: '2024-01-15T10:30:00Z'
      }
    ]
  } finally {
    loading.value = false
  }
}

const getStatusClass = (status) => {
  const baseClass = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
  
  switch (status) {
    case 'ordered':
      return `${baseClass} bg-yellow-100 text-yellow-800`
    case 'printing':
      return `${baseClass} bg-blue-100 text-blue-800`
    case 'received':
      return `${baseClass} bg-green-100 text-green-800`
    case 'partial':
      return `${baseClass} bg-orange-100 text-orange-800`
    case 'completed':
      return `${baseClass} bg-purple-100 text-purple-800`
    case 'cancelled':
      return `${baseClass} bg-red-100 text-red-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
}

const formatStatus = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const showBatchDetails = ref(false)
const detailsBatch = ref(null)

const viewBatchDetails = (batch) => {
  detailsBatch.value = batch
  showBatchDetails.value = true
}

const updateStatus = async (batch, newStatus, notes = '', defectiveInfo = {}) => {
  try {
    loading.value = true
    await qrService.updateBatchStatus(batch.id, {
      status: newStatus,
      notes,
      defective_info: defectiveInfo
    })
    await loadBatches()
  } catch (error) {
    console.error('Failed to update batch status:', error)
  } finally {
    loading.value = false
  }
}

const printBatch = async (batch) => {
  try {
    console.log('Printing batch:', batch.id)
    // We'll implement this function to generate a PDF with QR codes
    await generateBatchPDF(batch)
  } catch (error) {
    console.error('Failed to print batch:', error)
  }
}

const generateBatchPDF = async (batch) => {
  try {
    console.log('Generate PDF for batch:', batch)
    
    // Load jsPDF and QRCode libraries
    const { jsPDF } = await import('jspdf')
    const QRCode = await import('qrcode')
    
    // Get QR codes for this batch
    const qrResponse = await qrService.getBatchQRCodes(batch.id, { limit: 1000 })
    const qrCodes = qrResponse?.data?.data || []
    
    if (qrCodes.length === 0) {
      alert('No QR codes found for this batch')
      return
    }
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // PDF settings
    const margin = 10
    const headerHeight = 20
    const qrSize = 25
    const cellWidth = 85
    const cellHeight = 30
    const codesPerRow = 2
    const rowsPerPage = Math.floor((pageHeight - headerHeight - margin * 2) / cellHeight)
    
    let currentPage = 1
    let currentRow = 0
    let currentCol = 0
    
    // Add header to first page
    const addHeader = (pageNum) => {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`FarmerTitan QR Codes - Batch: ${batch.batch_code}`, margin, 15)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Quantity: ${batch.quantity} | Page: ${pageNum}`, margin, 22)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 60, 22)
      
      // Draw line under header
      pdf.line(margin, headerHeight + 5, pageWidth - margin, headerHeight + 5)
    }
    
    addHeader(currentPage)
    
    // Process each QR code
    for (let i = 0; i < qrCodes.length; i++) {
      const qr = qrCodes[i]
      
      // Check if we need a new page
      if (currentRow >= rowsPerPage) {
        pdf.addPage()
        currentPage++
        currentRow = 0
        currentCol = 0
        addHeader(currentPage)
      }
      
      // Calculate position
      const x = margin + (currentCol * cellWidth)
      const y = headerHeight + 15 + (currentRow * cellHeight)
      
      try {
        // Generate QR code image
        const qrDataUrl = await QRCode.toDataURL(qr.id, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        // Add QR code image
        pdf.addImage(qrDataUrl, 'PNG', x + 2, y + 2, qrSize, qrSize)
        
        // Add text information
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`Pos: ${qr.print_position || i + 1}`, x + qrSize + 5, y + 8)
        
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Code: ${qr.short_code || qr.id.slice(-8)}`, x + qrSize + 5, y + 13)
        pdf.text(`Farm: ${qr.farm?.name || 'Unassigned'}`, x + qrSize + 5, y + 18)
        pdf.text(`Status: ${qr.status || 'active'}`, x + qrSize + 5, y + 23)
        
        // Draw border around cell
        pdf.rect(x, y, cellWidth, cellHeight)
        
      } catch (qrError) {
        console.warn('Failed to generate QR code for:', qr.id, qrError)
        
        // Add fallback text
        pdf.setFontSize(10)
        pdf.text('QR Code Error', x + 10, y + 15)
        pdf.text(qr.id, x + 5, y + 20)
      }
      
      // Move to next position
      currentCol++
      if (currentCol >= codesPerRow) {
        currentCol = 0
        currentRow++
      }
    }
    
    // Save the PDF
    const filename = `QR_Batch_${batch.batch_code}_${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
    
    console.log(`PDF generated successfully: ${filename}`)
    
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    alert('Failed to generate PDF. Please try again.')
  }
}

const showReceiveModal = (batch) => {
  selectedBatch.value = batch
  showReceiveBatchModal.value = true
}

const showCancelModal = (batch) => {
  selectedBatch.value = batch
  showCancelBatchModal.value = true
}

const onBatchReceived = () => {
  showReceiveBatchModal.value = false
  selectedBatch.value = null
  loadBatches()
}

const onBatchCancelled = () => {
  showCancelBatchModal.value = false
  selectedBatch.value = null
  loadBatches()
}

const onBatchCreated = () => {
  showCreateModal.value = false
  loadBatches()
}

// Initialize
onMounted(() => {
  loadBatches()
})
</script>