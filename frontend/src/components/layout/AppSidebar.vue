<template>
  <div class="h-full flex flex-col">
    <!-- Logo -->
    <div :class="['flex items-center py-6 border-b border-gray-200', isCollapsed ? 'px-4 justify-center' : 'px-6']">
      <div class="flex items-center">
        <div class="w-8 h-8 flex items-center justify-center">
          <img src="@/assets/images/farmertitan-logo.png" alt="FarmerTitan Logo" class="w-8 h-8 object-contain" />
        </div>
        <div v-if="!isCollapsed" class="ml-3">
          <h1 class="text-lg font-bold text-gray-900">FarmerTitan</h1>
          <p class="text-xs text-gray-500">Admin Panel</p>
        </div>
      </div>
    </div>
    
    <!-- Navigation -->
    <nav :class="['flex-1 py-6 space-y-1 overflow-y-auto', isCollapsed ? 'px-2' : 'px-4']">
      <!-- Dashboard -->
      <router-link
        to="/"
        :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'Dashboard' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
        :title="isCollapsed ? 'Dashboard' : ''"
      >
        <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
        <span v-if="!isCollapsed">Dashboard</span>
      </router-link>

      <!-- Farm Management Section -->
      <div class="pt-4">
        <h3 v-if="!isCollapsed" class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Farm Management
        </h3>
        <div class="mt-2 space-y-1">
          <!-- Farms -->
          <router-link
            to="/farms"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', ['Farms', 'FarmDetails'].includes($route.name) ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Farms' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
            <span v-if="!isCollapsed">Farms</span>
          </router-link>

          <!-- QR Codes -->
          <router-link
            to="/qr-codes"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'QRCodes' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'QR Codes' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM9 16a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zM12 16a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zM16 12a1 1 0 100 2 1 1 0 000-2zM15 16a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1z" clip-rule="evenodd" />
            </svg>
            <span v-if="!isCollapsed" class="flex-1">QR Codes</span>
            <span v-if="!isCollapsed" class="ml-auto px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">WIP</span>
          </router-link>
        </div>
      </div>

      <!-- Catalogs Section -->
      <div class="pt-4">
        <h3 v-if="!isCollapsed" class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          General Catalogs
        </h3>
        <div class="mt-2 space-y-1">
          <!-- Equipment Types -->
          <router-link
            to="/catalogs/equipment-types"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'EquipmentTypes' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Equipment Types' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            <span v-if="!isCollapsed">Equipment Types</span>
          </router-link>
          
          <!-- Equipment Makes -->
          <router-link
            to="/catalogs/equipment-makes"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'EquipmentMakes' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Equipment Makes' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.001 3.001 0 0 1-.621-4.72L4.318 3.44A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75Z" />
            </svg>
            <span v-if="!isCollapsed">Equipment Makes</span>
          </router-link>
          
          <!-- Equipment Models -->
          <router-link
            to="/catalogs/equipment-models"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'EquipmentModels' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Equipment Models' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m4.5 4.5V19.5a2.25 2.25 0 0 0 2.25 2.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-.75m-6 0a2.25 2.25 0 0 1-2.25-2.25v-.75m6 0V15a2.25 2.25 0 0 1 2.25-2.25h.75m-6 0a2.25 2.25 0 0 0-2.25 2.25v.75m6 0a2.25 2.25 0 0 0 2.25-2.25V15m0 0V9.75a2.25 2.25 0 0 0-2.25-2.25H15m1.5 4.5h-.75a2.25 2.25 0 0 1-2.25-2.25h0a2.25 2.25 0 0 1 2.25-2.25H21M3 12a6 6 0 0 1 12 0" />
            </svg>
            <span v-if="!isCollapsed">Equipment Models</span>
          </router-link>
          
          <!-- Equipment Trims -->
          <router-link
            to="/catalogs/equipment-trims"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'EquipmentTrims' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Equipment Trims' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.091 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <span v-if="!isCollapsed">Equipment Trims</span>
          </router-link>
          
          <!-- Parts -->
          <router-link
            to="/catalogs/part-types"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'PartTypes' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Part Types' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
            <span v-if="!isCollapsed">Part Types</span>
          </router-link>
          
          <!-- Consumables -->
          <router-link
            to="/catalogs/consumable-types"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'ConsumableTypes' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Consumable Types' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.848 8.25l1.536.887a3.3 3.3 0 003.232 0l1.536-.887m-6.304 0a2.417 2.417 0 00-1.536 2.25v2.5a2.417 2.417 0 001.536 2.25m4.768-4.5c1.423.23 2.4 1.308 2.4 2.25v2.5c0 .942-.977 2.02-2.4 2.25m0 0a.75.75 0 00-.75.75v3a.75.75 0 001.5 0v-3c0-.414.336-.75.75-.75zm-9.75 0h9.75" />
            </svg>
            <span v-if="!isCollapsed">Consumable Types</span>
          </router-link>
          
        </div>
      </div>
      
      <!-- Maintenance Section -->
      <div class="pt-4">
        <h3 v-if="!isCollapsed" class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Maintenance System
        </h3>
        <div class="mt-2 space-y-1">
          <!-- Maintenance -->
          <router-link
            to="/maintenance"
            :class="['sidebar-nav-item', isCollapsed ? 'justify-center' : '', $route.name === 'Maintenance' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive']"
            :title="isCollapsed ? 'Maintenance' : ''"
          >
            <svg :class="[isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008ZM15 15h.008v.008H15V15Zm0 2.25h.008v.008H15v-.008ZM14.25 15h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008ZM16.5 15h.008v.008H16.5V15Zm0 2.25h.008v.008H16.5v-.008Z" />
            </svg>
            <span v-if="!isCollapsed" class="flex-1">Maintenance</span>
          </router-link>
        </div>
      </div>
    </nav>
    
    <!-- Footer -->
    <div v-if="!isCollapsed" class="px-6 py-4 border-t border-gray-200">
      <p class="text-xs text-gray-500 text-center">
        Version 1.0.0
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppSidebar',
  props: {
    isCollapsed: {
      type: Boolean,
      default: false
    }
  }
}
</script>