<template>
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">404</h1>
    <p class="text-gray-600 mb-8">Page not found</p>
    <router-link to="/" class="btn btn-primary">
      Go back to Dashboard
    </router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>
