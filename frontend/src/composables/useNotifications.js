import { ref, reactive } from 'vue'

const notifications = ref([])
let notificationId = 0

export function useNotifications() {
  const addNotification = (notification) => {
    const id = ++notificationId
    const newNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      ...notification
    }
    
    notifications.value.push(newNotification)
    
    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
    
    return id
  }
  
  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }
  
  const clearAllNotifications = () => {
    notifications.value = []
  }
  
  // Convenience methods
  const success = (title, message = '', duration = 5000) => {
    return addNotification({ type: 'success', title, message, duration })
  }
  
  const error = (title, message = '', duration = 8000) => {
    return addNotification({ type: 'error', title, message, duration })
  }
  
  const warning = (title, message = '', duration = 6000) => {
    return addNotification({ type: 'warning', title, message, duration })
  }
  
  const info = (title, message = '', duration = 5000) => {
    return addNotification({ type: 'info', title, message, duration })
  }
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info
  }
}