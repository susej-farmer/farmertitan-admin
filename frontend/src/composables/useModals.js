import { ref, reactive } from 'vue'

const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'info',
  onConfirm: null,
  onCancel: null
})

const loadingModal = reactive({
  show: false,
  title: 'Loading...',
  message: 'Please wait while we process your request.'
})

export function useModals() {
  const showConfirmDialog = (options) => {
    return new Promise((resolve, reject) => {
      Object.assign(confirmDialog, {
        show: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to continue?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'info',
        onConfirm: () => {
          confirmDialog.show = false
          resolve(true)
        },
        onCancel: () => {
          confirmDialog.show = false
          resolve(false)
        }
      })
    })
  }
  
  const hideConfirmDialog = () => {
    confirmDialog.show = false
  }
  
  const showLoadingModal = (title = 'Loading...', message = 'Please wait while we process your request.') => {
    loadingModal.show = true
    loadingModal.title = title
    loadingModal.message = message
  }
  
  const hideLoadingModal = () => {
    loadingModal.show = false
  }
  
  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm()
    }
  }
  
  const handleCancel = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel()
    }
  }
  
  // Convenience methods for different types of confirmations
  const confirmDelete = (itemName = 'this item') => {
    return showConfirmDialog({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    })
  }
  
  const confirmSave = (message = 'Do you want to save your changes?') => {
    return showConfirmDialog({
      title: 'Save Changes',
      message,
      confirmText: 'Save',
      cancelText: 'Discard',
      type: 'warning'
    })
  }
  
  return {
    confirmDialog,
    loadingModal,
    showConfirmDialog,
    hideConfirmDialog,
    showLoadingModal,
    hideLoadingModal,
    handleConfirm,
    handleCancel,
    confirmDelete,
    confirmSave
  }
}