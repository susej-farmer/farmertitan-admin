# FarmerTitan Admin Panel

A comprehensive farm management system with equipment tracking, maintenance scheduling, production batch management, and QR code generation capabilities.

## Overview

FarmerTitan Admin Panel is a full-stack web application designed to streamline farm operations management. It provides tools for tracking equipment, managing maintenance schedules, monitoring production batches with QR code integration, and overseeing supplier relationships.

## Features

- **Farm Management** - Create and manage multiple farm locations with detailed information
- **Equipment Catalog** - Comprehensive equipment tracking with makes, models, types, and trims
- **Maintenance System** - Schedule and track equipment maintenance with customizable templates
- **Production Batch Tracking** - Monitor production batches with QR code generation and PDF reports
- **Supplier Management** - Track suppliers and manage relationships
- **Consumables & Parts** - Catalog consumable types and parts inventory
- **CSV Import** - Bulk import equipment data via CSV files
- **Task Management** - Track equipment-related tasks and assignments
- **QR Code Integration** - Generate and print QR codes for easy asset tracking

## Tech Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Vite** - Next-generation frontend tooling
- **Vue Router** - Official routing library
- **Pinia** - State management
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **jsPDF** - PDF generation
- **QRCode.js** - QR code generation

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **PostgreSQL** - Relational database
- **Supabase** - Backend-as-a-Service platform
- **Joi** - Data validation
- **Multer** - File upload handling
- **Winston** - Logging
- **Helmet** - Security middleware
- **bcrypt** - Password hashing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **PostgreSQL** >= 14.0
- **Supabase CLI** (optional, for local development)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/farmertitan-admin.git
cd farmertitan-admin
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# See Configuration section below
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
```

### 4. Database Setup

```bash
cd backend

# Run database migrations (if applicable)
# Or use the provided setup scripts
node setup-qr-tables.js
```

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_HOST=127.0.0.1
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
DB_SSL=false

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Application Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret-here
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3000
```

## Usage

### Development Mode

Run both frontend and backend in development mode:

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

The backend API will be available at `http://localhost:3000`

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Production Build

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## Project Structure

```
farmertitan-admin/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express application entry point
│   │   ├── clients/            # API clients
│   │   ├── database/           # Database configuration
│   │   ├── middleware/         # Express middleware
│   │   ├── routes/             # API routes
│   │   └── services/           # Business logic
│   ├── logs/                   # Application logs
│   ├── uploads/                # File uploads directory
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/         # Vue components
    │   ├── views/              # Page views
    │   ├── services/           # API services
    │   ├── router/             # Vue Router configuration
    │   ├── stores/             # Pinia stores
    │   ├── assets/             # Static assets
    │   └── App.vue             # Root component
    ├── public/                 # Public static files
    ├── package.json
    └── .env.example
```

## API Documentation

The backend provides a RESTful API for managing farm operations. For detailed API documentation, see [QR_API_DOCUMENTATION.md](backend/QR_API_DOCUMENTATION.md).

Key API endpoints include:
- `/api/farms` - Farm management
- `/api/equipment` - Equipment catalog
- `/api/maintenance` - Maintenance schedules
- `/api/batches` - Production batches
- `/api/suppliers` - Supplier management

## Scripts

### Backend Scripts
```bash
npm start         # Start production server
npm run dev       # Start development server with hot reload
npm test          # Run tests
npm run test:watch # Run tests in watch mode
```

### Frontend Scripts
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Lint and fix files
```

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests (if configured)
cd frontend
npm test
```

## Security

- Passwords are hashed using bcrypt
- API requests are rate-limited
- Helmet middleware for security headers
- CORS configuration for cross-origin requests
- JWT-based authentication (if implemented)
- Input validation using Joi

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please contact the FarmerTitan Team or open an issue in the repository.

## Acknowledgments

- Built with Vue.js and Express
- QR code generation powered by qrcode.js
- PDF generation using jsPDF
- Database powered by PostgreSQL and Supabase

---

Made with care by the FarmerTitan Team
