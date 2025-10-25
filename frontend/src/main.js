import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Import Tailwind CSS
import './style.css'

const app = createApp(App)

// Install plugins
app.use(createPinia())
app.use(router)

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error)
  console.error('Error info:', info)
  console.error('Component instance:', instance)
}

app.mount('#app')