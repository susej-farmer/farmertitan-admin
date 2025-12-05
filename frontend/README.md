# FarmerTitan Admin - Frontend

Modern Vue.js 3 admin panel for farm management operations with QR code generation, equipment tracking, and production batch monitoring.

## Overview

This is the frontend application for FarmerTitan Admin Panel, built with Vue.js 3 and Vite. It provides an intuitive interface for managing farms, equipment, maintenance schedules, production batches, and suppliers.

## Features

- **Dashboard** - Overview of farm operations and key metrics
- **Farm Management** - Create and manage multiple farm locations
- **Equipment Catalog** - Browse and manage equipment inventory with makes, models, types, and trims
- **Maintenance Tracking** - View and schedule equipment maintenance tasks
- **Production Batches** - Monitor production batches with QR code integration and PDF generation
- **Supplier Management** - Track suppliers and their information
- **Consumables & Parts** - Manage consumable types and parts catalog
- **CSV Import** - Bulk import equipment data
- **QR Code Generation** - Generate printable QR codes for assets
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS

## Tech Stack

- **Vue.js 3** - Progressive JavaScript framework with Composition API
- **Vite** - Next-generation frontend build tool
- **Vue Router 4** - Official routing library
- **Pinia** - Intuitive state management
- **Tailwind CSS 3** - Utility-first CSS framework
- **Axios** - Promise-based HTTP client
- **jsPDF** - Client-side PDF generation
- **QRCode.js** - QR code generation library
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 or **yarn** >= 1.22.0

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000/api
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` |

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Hot Module Replacement

Vite provides instant hot module replacement (HMR) for a smooth development experience. Changes to Vue components will be reflected immediately without losing component state.

## Building for Production

### Create Production Build

```bash
npm run build
```

This will generate optimized production files in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally at `http://localhost:4173`

## Code Quality

### Linting

```bash
npm run lint
```

This will run ESLint and automatically fix issues where possible.

## Project Structure

```
frontend/
├── public/              # Static assets
│   └── favicon.ico
├── src/
│   ├── assets/          # Images, fonts, and other assets
│   ├── components/      # Reusable Vue components
│   │   ├── farms/       # Farm-related components
│   │   └── shared/      # Shared UI components
│   ├── router/          # Vue Router configuration
│   │   └── index.js     # Route definitions
│   ├── services/        # API service modules
│   │   ├── api.js       # Axios instance configuration
│   │   └── farmsApi.js  # Farm-related API calls
│   ├── stores/          # Pinia state management
│   │   └── auth.js      # Authentication store
│   ├── views/           # Page components
│   │   ├── catalogs/    # Catalog views (equipment, parts, etc.)
│   │   ├── farms/       # Farm management views
│   │   ├── Dashboard.vue
│   │   ├── Login.vue
│   │   ├── Maintenance.vue
│   │   └── QRCodes.vue
│   ├── App.vue          # Root component
│   ├── main.js          # Application entry point
│   └── style.css        # Global styles
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── package.json
└── .env                 # Environment variables
```

## Key Components

### Views
- **Dashboard.vue** - Main dashboard with operations overview
- **Login.vue** - User authentication
- **Maintenance.vue** - Equipment maintenance management
- **QRCodes.vue** - QR code generation and management
- **catalogs/** - Equipment catalog views (makes, models, types, trims, parts, consumables)
- **farms/** - Farm management and equipment listing

### Services
- **api.js** - Axios configuration with interceptors
- **farmsApi.js** - Farm-related API endpoints

### Stores
- **auth.js** - Authentication state and user session management

## API Integration

The frontend communicates with the backend API through Axios. All API calls are defined in the `services/` directory.

**Example API Service:**

```javascript
import api from './api'

export const farmsApi = {
  getFarms: () => api.get('/farms'),
  getFarm: (id) => api.get(`/farms/${id}`),
  createFarm: (data) => api.post('/farms', data),
  updateFarm: (id, data) => api.put(`/farms/${id}`, data),
  deleteFarm: (id) => api.delete(`/farms/${id}`)
}
```

## Routing

Routes are defined in `src/router/index.js`. The application uses Vue Router 4 with the following main routes:

- `/` - Dashboard
- `/login` - Login page
- `/farms` - Farm management
- `/maintenance` - Maintenance schedules
- `/qr-codes` - QR code management
- `/catalogs/*` - Various catalog views

## State Management

The application uses Pinia for state management. Stores are located in `src/stores/`.

**Example Store Usage:**

```javascript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const user = authStore.user
```

## Styling

The application uses Tailwind CSS for styling. Custom configurations can be found in `tailwind.config.js`.

**Tailwind Plugins Enabled:**
- `@tailwindcss/forms` - Form styling
- `@tailwindcss/typography` - Typography utilities

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. You can specify a custom port:

```bash
npm run dev -- --port 3001
```

### API Connection Issues

Ensure the backend server is running and the `VITE_API_URL` in your `.env` file points to the correct backend URL.

### Build Errors

Clear the cache and reinstall dependencies:

```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Lint and fix code with ESLint |

## Performance Optimization

- **Code Splitting** - Automatic route-based code splitting
- **Lazy Loading** - Components loaded on demand
- **Tree Shaking** - Unused code elimination in production builds
- **Asset Optimization** - Images and assets optimized by Vite

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the existing code style
3. Run linting: `npm run lint`
4. Test your changes thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

---

Built with Vue.js 3 and Vite
