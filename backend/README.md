# FarmerTitan Admin - Backend API

RESTful API backend for FarmerTitan farm management system, built with Node.js, Express, and PostgreSQL.

## Overview

This is the backend API for FarmerTitan Admin Panel, providing endpoints for farm management, equipment tracking, maintenance scheduling, production batch monitoring with QR codes, and supplier management.

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

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0 or **Supabase account**

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

### 3. Database Setup

#### Option A: Using Supabase

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and keys to `.env`
3. Run the setup scripts:

```bash
node setup-qr-tables.js
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL 14 or higher
2. Create a database
3. Update `.env` with your database credentials
4. Run the setup scripts:

```bash
node setup-qr-tables.js
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

For complete API documentation, see [QR_API_DOCUMENTATION.md](./QR_API_DOCUMENTATION.md)

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

### Database Connection Errors

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection with psql
psql -h localhost -U postgres -d your_database
```

### Port Already in Use

Change the `PORT` in `.env` or kill the process:

```bash
lsof -ti:3000 | xargs kill -9
```

### Permission Errors on Uploads

```bash
chmod 755 uploads/
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |

## Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass: `npm test`
4. Follow existing code style
5. Submit a pull request

## License

MIT License - see LICENSE file for details

---

Built with Node.js and Express
