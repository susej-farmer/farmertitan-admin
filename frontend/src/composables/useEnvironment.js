import { ref, computed } from 'vue'
import { ENVIRONMENTS, DEFAULT_ENVIRONMENT, ENVIRONMENT_STORAGE_KEY } from '@/config/environments'

// Reactive state for current environment (shared across all components)
const currentEnvironment = ref(null)

/**
 * Composable for managing application environment
 *
 * The environment determines which backend database the API connects to.
 * Frontend always connects to localhost, but sends environment in headers.
 */
export function useEnvironment() {
  // Initialize environment from localStorage if not already set
  if (!currentEnvironment.value) {
    const stored = localStorage.getItem(ENVIRONMENT_STORAGE_KEY)
    if (stored && ENVIRONMENTS[stored.toUpperCase()]) {
      currentEnvironment.value = ENVIRONMENTS[stored.toUpperCase()]
    } else {
      currentEnvironment.value = DEFAULT_ENVIRONMENT
    }
  }

  // Computed properties
  const environmentId = computed(() => currentEnvironment.value?.id || 'local')
  const environmentName = computed(() => currentEnvironment.value?.name || 'Local')
  const environmentIcon = computed(() => currentEnvironment.value?.icon || '🟢')
  const isProduction = computed(() => environmentId.value === 'production')
  const isDevelopment = computed(() => environmentId.value === 'development')
  const isLocal = computed(() => environmentId.value === 'local')
  const showBanner = computed(() => true) // Show banner for all environments

  /**
   * Set the current environment
   * @param {string} envId - Environment ID (local, development, production)
   */
  const setEnvironment = (envId) => {
    const env = Object.values(ENVIRONMENTS).find(e => e.id === envId)
    if (env) {
      currentEnvironment.value = env
      localStorage.setItem(ENVIRONMENT_STORAGE_KEY, envId)
      console.log(`[Environment] Switched to: ${env.displayName}`)
    } else {
      console.warn(`[Environment] Invalid environment ID: ${envId}`)
    }
  }

  /**
   * Get the current environment for API requests
   * @returns {string} Current environment ID
   */
  const getEnvironmentForAPI = () => {
    return environmentId.value
  }

  /**
   * Clear environment (reset to default)
   */
  const clearEnvironment = () => {
    currentEnvironment.value = DEFAULT_ENVIRONMENT
    localStorage.removeItem(ENVIRONMENT_STORAGE_KEY)
  }

  /**
   * Get environment config
   * @returns {Object} Current environment configuration
   */
  const getEnvironmentConfig = () => {
    return currentEnvironment.value
  }

  return {
    // State
    currentEnvironment: computed(() => currentEnvironment.value),

    // Computed
    environmentId,
    environmentName,
    environmentIcon,
    isProduction,
    isDevelopment,
    isLocal,
    showBanner,

    // Methods
    setEnvironment,
    getEnvironmentForAPI,
    clearEnvironment,
    getEnvironmentConfig,

    // Constants
    ENVIRONMENTS
  }
}
