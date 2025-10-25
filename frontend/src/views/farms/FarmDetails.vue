<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Farm Details</h1>
    <p class="text-gray-600">Farm ID: {{ $route.params.id }}</p>
  </div>
</template>

<script>
export default {
  name: 'FarmDetails'
}
</script>
