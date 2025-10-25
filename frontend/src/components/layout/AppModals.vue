<template>
  <div>
    <!-- Global confirmation modal -->
    <ConfirmDialog
      v-if="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :type="confirmDialog.type"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
    
    <!-- Global loading modal -->
    <LoadingModal
      v-if="loadingModal.show"
      :title="loadingModal.title"
      :message="loadingModal.message"
    />
  </div>
</template>

<script>
import { useModals } from '@/composables/useModals'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import LoadingModal from '@/components/shared/LoadingModal.vue'

export default {
  name: 'AppModals',
  components: {
    ConfirmDialog,
    LoadingModal
  },
  setup() {
    const { confirmDialog, loadingModal, handleConfirm, handleCancel } = useModals()
    
    return {
      confirmDialog,
      loadingModal,
      handleConfirm,
      handleCancel
    }
  }
}
</script>