import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Views
import Dashboard from '@/views/Dashboard.vue'
import Login from '@/views/Login.vue'

// Catalog views
import EquipmentTypes from '@/views/catalogs/EquipmentTypes.vue'
import EquipmentMakes from '@/views/catalogs/EquipmentMakes.vue'
import EquipmentModels from '@/views/catalogs/EquipmentModels.vue'
import EquipmentTrims from '@/views/catalogs/EquipmentTrims.vue'
import Maintenance from '@/views/Maintenance.vue'
import PartTypes from '@/views/catalogs/PartTypes.vue'
import ConsumableTypes from '@/views/catalogs/ConsumableTypes.vue'

// Farm views
import FarmsOverview from '@/views/farms/FarmsOverview.vue'
import FarmDetails from '@/views/farms/FarmDetails.vue'

// QR Code views
import QRCodes from '@/views/QRCodes.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: 'Login',
      requiresGuest: true
    }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard',
      breadcrumbs: ['Dashboard'],
      requiresAuth: true
    }
  },
  
  // Catalog routes
  {
    path: '/catalogs',
    name: 'Catalogs',
    redirect: '/catalogs/equipment-types',
    meta: {
      title: 'Catalogs',
      breadcrumbs: ['Catalogs']
    }
  },
  {
    path: '/catalogs/equipment-types',
    name: 'EquipmentTypes',
    component: EquipmentTypes,
    meta: {
      title: 'Equipment Types',
      breadcrumbs: ['Catalogs', 'Equipment Types'],
      requiresAuth: true
    }
  },
  {
    path: '/catalogs/equipment-makes',
    name: 'EquipmentMakes',
    component: EquipmentMakes,
    meta: {
      title: 'Equipment Makes',
      breadcrumbs: ['Catalogs', 'Equipment Makes'],
      requiresAuth: true
    }
  },
  {
    path: '/catalogs/equipment-models',
    name: 'EquipmentModels',
    component: EquipmentModels,
    meta: {
      title: 'Equipment Models',
      breadcrumbs: ['Catalogs', 'Equipment Models'],
      requiresAuth: true
    }
  },
  {
    path: '/catalogs/equipment-trims',
    name: 'EquipmentTrims',
    component: EquipmentTrims,
    meta: {
      title: 'Equipment Trims',
      breadcrumbs: ['Catalogs', 'Equipment Trims'],
      requiresAuth: true
    }
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: Maintenance,
    meta: {
      title: 'Maintenance',
      breadcrumbs: ['Maintenance'],
      requiresAuth: true
    }
  },
  {
    path: '/catalogs/part-types',
    name: 'PartTypes',
    component: PartTypes,
    meta: {
      title: 'Part Types',
      breadcrumbs: ['Catalogs', 'Part Types'],
      requiresAuth: true
    }
  },
  {
    path: '/catalogs/consumable-types',
    name: 'ConsumableTypes',
    component: ConsumableTypes,
    meta: {
      title: 'Consumable Types',
      breadcrumbs: ['Catalogs', 'Consumable Types'],
      requiresAuth: true
    }
  },
  
  // Farm routes
  {
    path: '/farms',
    name: 'Farms',
    component: FarmsOverview,
    meta: {
      title: 'Farms Overview',
      breadcrumbs: ['Farms'],
      requiresAuth: true
    }
  },
  {
    path: '/farms/:id',
    name: 'FarmDetails',
    component: FarmDetails,
    meta: {
      title: 'Farm Details',
      breadcrumbs: ['Farms', 'Farm Details'],
      requiresAuth: true
    }
  },
  
  // QR Code routes
  {
    path: '/qr-codes',
    name: 'QRCodes',
    component: QRCodes,
    meta: {
      title: 'QR Codes',
      breadcrumbs: ['QR Codes'],
      requiresAuth: true
    }
  },
  
  // Catch-all route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Global navigation guards
router.beforeEach(async (to, from, next) => {
  // Set page title
  const baseTitle = 'FarmerTitan Admin'
  const pageTitle = to.meta.title
  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle
  
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Try to restore auth from localStorage and verify with server
      if (authStore.token) {
        try {
          await authStore.getCurrentUser()
        } catch (error) {
          console.error('Token validation failed:', error)
        }
      }
      
      // If still not authenticated, redirect to login
      if (!authStore.isAuthenticated) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
  }
  
  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }
  
  next()
})

router.afterEach((to, from) => {
  // Analytics or logging could go here
  console.log(`Navigated from ${from.name} to ${to.name}`)
})

export default router