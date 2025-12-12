# Environment Management System

## 📋 Overview

This system allows users to switch between different backend database environments (Local, Development, Production) from the frontend without changing any configuration files.

**How it works:**
- Frontend always connects to `localhost:3000/api` (or configured local backend)
- User selects environment during login
- Every API request includes `X-Environment` header
- Backend uses this header to connect to the appropriate database

---

## 🎯 Key Components

### 1. **Environment Configuration** (`src/config/environments.js`)

Defines available environments:

```javascript
ENVIRONMENTS = {
  LOCAL: {
    id: 'local',
    name: 'Local',
    displayName: 'Local Development',
    icon: '🟢',
    bannerClass: 'bg-green-600 text-white'
  },
  DEVELOPMENT: {
    id: 'development',
    name: 'Development',
    displayName: 'Development Server',
    icon: '🟡',
    bannerClass: 'bg-yellow-500 text-gray-900'
  },
  PRODUCTION: {
    id: 'production',
    name: 'Production',
    displayName: 'Production',
    icon: '🔴',
    bannerClass: 'bg-red-600 text-white'
  }
}
```

### 2. **Composable** (`src/composables/useEnvironment.js`)

Manages environment state and persistence:

```javascript
const {
  currentEnvironment,
  environmentId,
  environmentName,
  isProduction,
  isDevelopment,
  isLocal,
  showBanner,
  setEnvironment,
  getEnvironmentForAPI
} = useEnvironment()
```

**Features:**
- Stores selected environment in `localStorage`
- Reactive state shared across all components
- Computed flags for environment checking
- Auto-initialization on app load

### 3. **API Interceptor** (`src/services/api.js`)

Automatically adds environment to ALL requests:

```javascript
// Every API request includes this header
config.headers['X-Environment'] = environment  // 'local', 'development', or 'production'
```

### 4. **Login Screen** (`src/views/Login.vue`)

Environment selector integrated into login form:

```vue
<select v-model="form.environment">
  <option value="local">🟢 Local Development</option>
  <option value="development">🟡 Development Server</option>
  <option value="production">🔴 Production</option>
</select>
```

### 5. **Environment Banner** (`src/components/shared/EnvironmentBanner.vue`)

Visual indicator displayed when NOT in local environment:

- **Production**: Red banner at the top - `🔴 PRODUCTION`
- **Development**: Yellow banner at the top - `🟡 DEVELOPMENT`
- **Local**: No banner shown

---

## 🔧 Backend Integration

### Required: Backend must handle `X-Environment` header

The backend should:

1. **Read the header** from every request:
   ```javascript
   const environment = req.headers['x-environment'] || 'local'
   ```

2. **Select database connection** based on environment:
   ```javascript
   const dbConfig = {
     local: process.env.LOCAL_DB_URL,
     development: process.env.DEV_DB_URL,
     production: process.env.PROD_DB_URL
   }

   const connectionString = dbConfig[environment]
   ```

3. **Example Express middleware**:
   ```javascript
   app.use((req, res, next) => {
     req.environment = req.headers['x-environment'] || 'local'
     console.log(`[Request] Environment: ${req.environment}`)
     next()
   })
   ```

---

## 🚀 Usage

### For End Users (Your Boss)

1. **Login Screen:**
   - Enter email and password
   - Select environment from dropdown:
     - 🟢 Local Development (for testing locally)
     - 🟡 Development Server (for staging/testing)
     - 🔴 Production (for live data)
   - Click "Sign in"

2. **After Login:**
   - Banner appears at top (if not Local)
   - All data comes from selected environment
   - To switch environments: logout and login again

### For Developers

**Get current environment:**
```javascript
import { useEnvironment } from '@/composables/useEnvironment'

const { environmentId, isProduction } = useEnvironment()

console.log(environmentId.value) // 'local', 'development', or 'production'

if (isProduction.value) {
  console.warn('You are in PRODUCTION!')
}
```

**Change environment programmatically:**
```javascript
const { setEnvironment } = useEnvironment()

setEnvironment('development')
// User should re-login after changing environment
```

**Check environment in components:**
```vue
<template>
  <div>
    <div v-if="isProduction" class="text-red-600">
      WARNING: You are in production!
    </div>
  </div>
</template>

<script setup>
import { useEnvironment } from '@/composables/useEnvironment'
const { isProduction } = useEnvironment()
</script>
```

---

## 📂 Files Modified/Created

### Created:
- `src/config/environments.js` - Environment definitions
- `src/composables/useEnvironment.js` - Environment management
- `src/components/shared/EnvironmentBanner.vue` - Visual indicator
- `ENVIRONMENT_SETUP.md` - This documentation

### Modified:
- `src/services/api.js` - Added `X-Environment` header to all requests
- `src/views/Login.vue` - Added environment selector
- `src/App.vue` - Integrated environment banner

---

## 🎨 Visual Examples

### Login Screen
```
┌─────────────────────────────┐
│   FarmerTitan Admin         │
│                             │
│   Email: [user@email.com]   │
│   Password: [••••••••••]    │
│                             │
│   Environment:              │
│   ┌─────────────────────┐   │
│   │ 🟢 Local Dev...    ▼│   │
│   └─────────────────────┘   │
│                             │
│   [    Sign in    ]         │
└─────────────────────────────┘
```

### Production Banner (After Login)
```
┌─────────────────────────────────────────┐
│ 🔴 PRODUCTION ENVIRONMENT               │ <- RED BANNER
│ Live production environment             │
├─────────────────────────────────────────┤
│ Logo  |  Dashboard  |  Settings  | User │
└─────────────────────────────────────────┘
```

### Development Banner
```
┌─────────────────────────────────────────┐
│ 🟡 DEVELOPMENT SERVER                   │ <- YELLOW BANNER
│ Development/staging environment         │
├─────────────────────────────────────────┤
│ Logo  |  Dashboard  |  Settings  | User │
└─────────────────────────────────────────┘
```

### Local (No Banner)
```
┌─────────────────────────────────────────┐
│ Logo  |  Dashboard  |  Settings  | User │ <- NO BANNER
└─────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Environment persists** in `localStorage` until changed
2. **All API requests** automatically include environment header
3. **Backend is responsible** for connecting to correct database
4. **No need to change .env files** - all switching is done at runtime
5. **Users should re-login** when switching environments for security

---

## 🔍 Troubleshooting

**Problem:** Environment not changing after login
**Solution:** Check browser localStorage: `localStorage.getItem('farmertitan_environment')`

**Problem:** Backend still using wrong database
**Solution:** Verify backend reads `X-Environment` header from requests

**Problem:** Banner not showing
**Solution:** Banner only shows for non-local environments. Check `useEnvironment().showBanner`

**Problem:** Environment resets to 'local'
**Solution:** localStorage might be cleared. Default is 'local' if not set.

---

## 🛠️ Future Enhancements

- [ ] Add environment indicator in sidebar footer
- [ ] Add quick switcher in user menu (dev mode only)
- [ ] Log environment changes for audit trail
- [ ] Add confirmation dialog when switching to production
- [ ] Environment-specific color theming

---

**Last Updated:** 2025-12-10
**Maintained by:** Development Team
