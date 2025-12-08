# FarmerTitan Admin - Backend API

> RESTful API backend for FarmerTitan farm management system

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Table of Contents

- [🚀 New Developer Setup](#-new-developer-setup)
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Security](#security)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 🚀 New Developer Setup

> **First time setting up the project? Start here!**

This guide will get you from zero to a fully working local environment with production data in about 10 minutes.

### What You'll Get

After following this setup, you'll have:
- ✅ A local PostgreSQL database running in Docker
- ✅ **Production data** (29 farms, 53 users, all tables populated)
- ✅ Supabase API running locally
- ✅ A web UI to browse your database
- ✅ Backend API server connected to your local database

### Step 1: Install Requirements

**Install these in order:**

1. **Node.js 18+** - [Download here](https://nodejs.org/)
   ```bash
   node --version  # Verify: should show v18.x or higher
   ```

2. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
   - Install and **open Docker Desktop**
   - Wait for it to start (you'll see the Docker icon in your menu bar)
   ```bash
   docker --version  # Verify: should show version 20.x or higher
   ```

3. **Supabase CLI**
   ```bash
   # macOS (recommended)
   brew install supabase/tap/supabase

   # Or npm (cross-platform)
   npm install -g supabase

   # Verify installation
   supabase --version  # Should show 2.x.x
   ```

### Step 2: Clone & Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd farmertitan-admin

# 2. Install backend dependencies
cd backend
npm install

# 3. Go back to project root for Supabase
cd ..
```

### Step 3: Start Supabase (This does everything!)

```bash
# Make sure Docker Desktop is running first!

# Start Supabase (from project root)
supabase start
```

**This command will:**
- Download Docker images (first time only, ~2-3 minutes)
- Start PostgreSQL, Supabase API, and Studio
- **Automatically create all database tables**
- **Automatically load production data** (farms, equipment, users, etc.)
- Show you the credentials you need

**Save this output!** It should look like:
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
      Studio URL: http://127.0.0.1:54323
 Publishable key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      Secret key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Configure Backend

```bash
cd backend

# Copy the example .env file
cp .env.example .env

# Open .env in your editor and update these 3 values:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=<paste "Publishable key" from step 3>
# SUPABASE_SERVICE_KEY=<paste "Secret key" from step 3>
```

### Step 5: Start Backend Server

```bash
npm run dev
```

You should see:
```
Server running on port 3000
Connected to database
```

### Step 6: Verify Everything Works

**Test the API:**
```bash
curl http://localhost:3000/api/farms
# Should return JSON with ~29 farms
```

**Browse the database:**
Open http://localhost:54323 in your browser to see Supabase Studio

**Check you have production data:**
- Click "Table Editor" in the left sidebar
- Click on the `farm` table
- You should see 29 farms with real data

### 🎉 You're Done!

Your local environment is now running with production data!

**URLs to remember:**
- Backend API: http://localhost:3000
- Supabase Studio: http://localhost:54323
- API Docs: http://localhost:3000/api-docs

**Common commands:**
```bash
# Stop Supabase (but keep data)
supabase stop

# Start Supabase again
supabase start

# Reset to fresh production data
supabase db reset
```

**Next Steps:**
- Read the [Project Structure](#project-structure) to understand the codebase
- Check out the [API Documentation](#api-documentation)
- Read [Contributing](#contributing) guidelines before making changes

**Having issues?** Jump to [Troubleshooting](#troubleshooting)

---

## Overview

This is the backend API for FarmerTitan Admin Panel, providing endpoints for farm management, equipment tracking, maintenance scheduling, production batch monitoring with QR codes, and supplier management.

**Key Highlights:**
- Clean 3-layer architecture (Routes → Services → Clients)
- Comprehensive error handling and logging
- Secure authentication with JWT
- CSV import for bulk operations
- QR code generation and PDF reports

## Quick Start

> **For New Developers**: Follow these steps to get your local environment running with production data in ~5 minutes.

```bash
# 1. Clone the repository (if you haven't already)
git clone <repository-url>
cd farmertitan-admin

# 2. Install backend dependencies
cd backend
npm install

# 3. Make sure Docker Desktop is running
# Open Docker Desktop and ensure it's started

# 4. Start Supabase local instance (from project root)
cd ..
supabase start
# This will take 2-3 minutes on first run (downloads Docker images)
# Save the output - you'll need the API URL and keys

# 5. Configure environment variables
cd backend
cp .env.example .env
# Update .env with credentials from "supabase start" output

# 6. Start the development server
npm run dev
```

**You're done!** 🎉

- **API**: `http://localhost:3000`
- **Supabase Studio** (Database UI): `http://localhost:54323`
- **Your local DB has production data** from DEV environment

> **Important**: The `supabase start` command automatically loads the production schema and seed data from the `supabase/` directory. You don't need to run any manual migrations or import data.

## Features

- **RESTful API** - Well-structured REST endpoints
- **Farm Management** - CRUD operations for farms
- **Equipment Catalog** - Manage equipment, makes, models, types, and trims
- **Maintenance System** - Track maintenance schedules and tasks
- **Production Batches** - Monitor batches with QR code generation
- **Supplier Management** - Track suppliers and relationships
- **CSV Import** - Bulk import equipment data via CSV files
- **Task Management** - Equipment task tracking
- **PDF Generation** - Generate reports with QR codes
- **File Upload** - Handle CSV and image uploads
- **Authentication** - Secure user authentication
- **Logging** - Comprehensive logging with Winston
- **Input Validation** - Request validation with Joi
- **Security** - Helmet, CORS, rate limiting, and password hashing

## Tech Stack

- **Node.js** >= 18.0.0 - JavaScript runtime
- **Express** - Web application framework
- **PostgreSQL** - Relational database
- **Supabase** - Backend-as-a-Service platform with PostgreSQL
- **Joi** - Data validation
- **Multer** - Multipart/form-data handling for file uploads
- **Winston** - Logging library
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **bcrypt** - Password hashing
- **Express Rate Limit** - Rate limiting middleware
- **jsPDF** - PDF generation
- **QRCode** - QR code generation
- **CSV Parser** - CSV file parsing
- **dotenv** - Environment variable management
- **Jest** - Testing framework
- **Supertest** - HTTP assertions for testing

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** >= 18.0.0 - [Download](https://nodejs.org/)
- **npm** >= 9.0.0 - (Comes with Node.js)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
  - Required for running Supabase locally
  - Make sure Docker is running before starting Supabase
- **Supabase CLI** - [Installation Guide](https://supabase.com/docs/guides/cli/getting-started)
  ```bash
  # macOS
  brew install supabase/tap/supabase

  # npm (cross-platform)
  npm install -g supabase

  # Verify installation
  supabase --version
  ```

### Optional (for advanced users)

- **psql** (PostgreSQL client) - Only if you need direct database access
  - macOS: `brew install postgresql`
  - Linux: `sudo apt-get install postgresql-client`
  - Windows: Download from [PostgreSQL.org](https://www.postgresql.org/download/windows/)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

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
JWT_SECRET=your-secure-jwt-secret-key-here
```

**Environment Variables:**

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | Database host | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `DB_PORT` | Database port | Yes |
| `DB_SSL` | Enable SSL connection | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |

### 3. Database Setup with Supabase

**Important:** This application uses **Supabase**, not standalone PostgreSQL.

#### Option A: Local Development with Production Data ⭐ **Recommended**

This is the setup used by the development team. It gives you a local database with real production data.

**Prerequisites Check:**
```bash
# 1. Verify Docker is running
docker --version
# Should show: Docker version 20.x or higher

# 2. Verify Supabase CLI is installed
supabase --version
# Should show: 2.x.x or higher
```

**Step-by-Step Setup:**

**1. Navigate to project root:**
```bash
cd /path/to/farmertitan-admin
```

**2. Start Supabase (first time will take 2-3 minutes):**
```bash
supabase start
```

This command will:
- ✅ Download Docker images (first time only)
- ✅ Start PostgreSQL database (port `54322`)
- ✅ Start Supabase API (port `54321`)
- ✅ Start Supabase Studio web UI (port `54323`)
- ✅ **Automatically load production schema** from `supabase/migrations/`
- ✅ **Automatically seed production data** from `supabase/seed.sql`
- ✅ Create authentication users from production

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
    Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
 Publishable key: eyJhbGc... [COPY THIS]
      Secret key: eyJhbGc... [COPY THIS]
```

**3. Update your `.env` file:**

Copy the `.env.example` file:
```bash
cd backend
cp .env.example .env
```

Edit `.env` and update these values from the `supabase start` output:
```env
# Supabase Configuration (from "supabase start" output)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGc... # Paste "Publishable key" here
SUPABASE_SERVICE_KEY=eyJhbGc... # Paste "Secret key" here

# Database Configuration (for direct psql access)
DB_HOST=127.0.0.1
DB_PORT=54322
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
DB_SSL=false

# Application Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=farmertitan-admin-secret-key-2024
FRONTEND_URL=http://localhost:5174
```

**4. Verify your database has data:**

Open Supabase Studio in your browser:
```bash
open http://localhost:54323
```

Click on "Table Editor" and check:
- ✅ `farm` table should have ~29 farms
- ✅ `auth.users` should have ~53 users
- ✅ All production tables should be populated

**5. Start the backend server:**
```bash
npm run dev
```

**6. Test the API:**
```bash
curl http://localhost:3000/api/farms
# Should return a list of farms
```

**Common Commands:**

```bash
# Stop Supabase (keeps data)
supabase stop

# Restart Supabase
supabase start

# Reset database to production state (WARNING: deletes local changes)
supabase db reset

# View logs
supabase logs

# Check migration status
supabase migration list

# Access database directly with psql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
```

#### Option B: Supabase Cloud

**1. Create a project:**
- Go to https://supabase.com
- Create a new project
- Wait for it to provision (~2 minutes)

**2. Apply migrations:**
```bash
# Link to your cloud project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# (Optional) Load seed data
psql "postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres" < supabase/seed.sql
```

**3. Get your credentials:**
- Go to Settings > API
- Copy `Project URL`, `anon key`, and `service_role key`

**4. Update your `.env`:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

#### Useful Commands

```bash
# Stop local Supabase
supabase stop

# Reset database (recreate + reseed)
supabase db reset

# Create new migration
supabase migration new my_migration_name

# Check migration status
supabase migration list

# View logs
supabase logs
```

## Development

### Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

**Development Features:**
- Auto-restart on file changes with Nodemon
- Detailed error messages
- Request logging

### Start Production Server

```bash
npm start
```

## Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

## Project Structure

```
backend/
├── src/
│   ├── app.js              # Express application entry point
│   ├── clients/            # Database clients and data access layer
│   │   ├── equipmentClient.js
│   │   ├── equipmentMakeClient.js
│   │   ├── equipmentModelClient.js
│   │   ├── equipmentTypeClient.js
│   │   ├── farmClient.js
│   │   └── ...
│   ├── database/           # Database configuration
│   │   └── connection.js   # PostgreSQL/Supabase connection
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── errorHandler.js # Error handling
│   │   └── validation.js   # Input validation
│   ├── routes/             # API route definitions
│   │   ├── farms.js
│   │   ├── equipment.js
│   │   ├── maintenance.js
│   │   └── ...
│   └── services/           # Business logic layer
│       ├── equipmentCatalogService.js
│       ├── equipmentManagementService.js
│       ├── equipmentMakeService.js
│       ├── farmService.js
│       └── ...
├── logs/                   # Application logs
├── uploads/                # Uploaded files (CSV, images)
├── .env.example            # Environment variables template
├── package.json
└── nodemon.json            # Nodemon configuration
```

## API Endpoints

### Farms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farms` | Get all farms |
| GET | `/api/farms/:id` | Get farm by ID |
| POST | `/api/farms` | Create new farm |
| PUT | `/api/farms/:id` | Update farm |
| DELETE | `/api/farms/:id` | Delete farm |

### Equipment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/equipment` | Get all equipment |
| GET | `/api/equipment/:id` | Get equipment by ID |
| POST | `/api/equipment` | Create equipment |
| PUT | `/api/equipment/:id` | Update equipment |
| DELETE | `/api/equipment/:id` | Delete equipment |
| POST | `/api/equipment/import` | Import equipment from CSV |

### Equipment Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/equipment-makes` | Get all makes |
| GET | `/api/equipment-models` | Get all models |
| GET | `/api/equipment-types` | Get all types |
| GET | `/api/equipment-trims` | Get all trims |

### Maintenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maintenance` | Get maintenance schedules |
| POST | `/api/maintenance` | Create maintenance task |
| PUT | `/api/maintenance/:id` | Update maintenance task |
| DELETE | `/api/maintenance/:id` | Delete maintenance task |

### Production Batches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/batches` | Get all batches |
| GET | `/api/batches/:id` | Get batch by ID |
| POST | `/api/batches` | Create batch |
| GET | `/api/batches/:id/pdf` | Generate PDF with QR code |

### Interactive API Documentation

When the server is running, access the **Swagger UI** for interactive API testing:

**Swagger UI:** `http://localhost:3000/api-docs`

For detailed API documentation, see [QR_API_DOCUMENTATION.md](./QR_API_DOCUMENTATION.md)

## Architecture

### Layered Architecture

```
Routes → Services → Clients → Database
```

- **Routes**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Clients**: Data access layer, interact with database
- **Database**: PostgreSQL via Supabase

### Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Express Rate Limit** - Rate limiting
4. **Body Parser** - Request body parsing
5. **Multer** - File upload handling
6. **Validation** - Input validation with Joi
7. **Authentication** - JWT verification
8. **Error Handler** - Centralized error handling

## Security

### Implemented Security Measures

- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Helmet** - Security headers
- **CORS** - Controlled cross-origin access
- **Rate Limiting** - Prevent brute force attacks
- **Input Validation** - Joi schema validation
- **SQL Injection Prevention** - Parameterized queries
- **File Upload Validation** - File type and size restrictions

### Best Practices

```javascript
// Always validate input
const schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
})

// Use parameterized queries
const result = await client.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
)
```

## Logging

Logs are stored in the `logs/` directory:

- `error.log` - Error level logs
- `combined.log` - All logs

**Log Levels:**
- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug messages (development only)

## File Uploads

Files are stored in the `uploads/` directory:

**Supported Formats:**
- CSV files for equipment import
- Image files for equipment photos

**Upload Limits:**
- File size: 5MB max
- CSV: 1000 rows max

## Database Schema

Key tables:
- `farms` - Farm information
- `equipment` - Equipment inventory
- `equipment_makes` - Equipment manufacturers
- `equipment_models` - Equipment models
- `equipment_types` - Equipment categories
- `equipment_trims` - Equipment variants
- `maintenance_schedules` - Maintenance tasks
- `production_batches` - Production batches with QR codes
- `suppliers` - Supplier information
- `consumable_types` - Consumable categories
- `part_types` - Part categories

## Error Handling

The API uses standard HTTP status codes:

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

**Error Response Format:**

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Performance Optimization

- **Connection Pooling** - PostgreSQL connection pool
- **Async/Await** - Non-blocking I/O operations
- **Query Optimization** - Indexed database queries
- **Response Compression** - Gzip compression
- **Caching Headers** - HTTP caching where appropriate

## Troubleshooting

### Supabase Won't Start

**Problem:** `supabase start` fails with "port already in use" error

**Solution:**
```bash
# Check if Supabase is already running
supabase status

# If it is, stop it first
supabase stop

# Then start again
supabase start
```

**Problem:** Docker-related errors

**Solution:**
```bash
# 1. Make sure Docker Desktop is running
open -a Docker  # macOS

# 2. Check Docker status
docker ps

# 3. If needed, restart Docker Desktop
```

### Database Has No Data

**Problem:** Tables are empty after `supabase start`

**Solution:**
```bash
# Reset database to load production data
supabase db reset
```

This will:
1. Drop all tables
2. Re-run migrations from `supabase/migrations/`
3. Load seed data from `supabase/seed.sql`

### Backend API Connection Errors

**Problem:** Backend can't connect to Supabase

**Solution:**
```bash
# 1. Verify Supabase is running
supabase status

# 2. Check your .env file has correct values
cat backend/.env | grep SUPABASE

# 3. Make sure URLs match supabase start output
# SUPABASE_URL should be http://localhost:54321 (not 127.0.0.1)
```

### Port Already in Use (Backend)

**Problem:** Port 3000 is already in use

**Solution:**
```bash
# Option 1: Change PORT in .env
echo "PORT=3001" >> backend/.env

# Option 2: Kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Permission Errors on Uploads

```bash
chmod 755 backend/uploads/
```

### Fresh Start (Nuclear Option)

If nothing works, start completely fresh:

```bash
# 1. Stop and remove all Supabase containers
supabase stop
docker volume ls | grep supabase | awk '{print $2}' | xargs docker volume rm

# 2. Remove node_modules
cd backend
rm -rf node_modules package-lock.json

# 3. Reinstall
npm install

# 4. Start fresh
cd ..
supabase start
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

### Development Workflow

1. **Fork & Clone** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** following our code style
4. **Write tests** for new features
5. **Run tests**: `npm test`
6. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add new endpoint for batch filtering
   fix: resolve authentication middleware bug
   docs: update API documentation
   ```
7. **Push** to your branch: `git push origin feature/my-feature`
8. **Create a Pull Request** with a clear description

### Code Style

- Use ES6+ features
- Follow existing patterns in the codebase
- Add JSDoc comments for complex functions
- Keep functions small and focused
- Use meaningful variable names

### Testing Guidelines

- Write unit tests for services and clients
- Write integration tests for API endpoints
- Aim for >80% code coverage
- Test error cases and edge cases

## License

MIT License - see LICENSE file for details

---

Built with Node.js and Express
