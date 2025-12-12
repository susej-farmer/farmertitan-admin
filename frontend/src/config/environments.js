/**
 * Environment Configuration
 *
 * Defines available environments for the application.
 * The frontend always connects to localhost backend,
 * but the backend uses this to determine which database to connect to.
 */

export const ENVIRONMENTS = {
  LOCAL: {
    id: 'local',
    name: 'Local',
    displayName: 'Local Development',
    color: 'green',
    icon: '🟢',
    description: 'Local development environment',
    bannerClass: 'bg-green-600 text-white',
    badgeClass: 'bg-green-100 text-green-800'
  },
  DEVELOPMENT: {
    id: 'development',
    name: 'Development',
    displayName: 'Development Server',
    color: 'yellow',
    icon: '🟡',
    description: 'Development/staging environment',
    bannerClass: 'bg-yellow-500 text-gray-900',
    badgeClass: 'bg-yellow-100 text-yellow-800'
  },
  PRODUCTION: {
    id: 'production',
    name: 'Production',
    displayName: 'Production',
    color: 'red',
    icon: '🔴',
    description: 'Live production environment',
    bannerClass: 'bg-red-600 text-white',
    badgeClass: 'bg-red-100 text-red-800'
  }
}

// Array of environments for dropdowns/selectors
export const ENVIRONMENT_LIST = Object.values(ENVIRONMENTS)

// Default environment
export const DEFAULT_ENVIRONMENT = ENVIRONMENTS.LOCAL

// Storage key for persisting environment selection
export const ENVIRONMENT_STORAGE_KEY = 'farmertitan_environment'
