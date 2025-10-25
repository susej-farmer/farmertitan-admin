import { ref } from 'vue'

export function useAsyncData() {
  const loading = ref(false)
  const error = ref(null)

  const execute = async (asyncFunction) => {
    loading.value = true
    error.value = null
    try {
      const result = await asyncFunction()
      return result
    } catch (err) {
      error.value = err.message || 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    execute
  }
}