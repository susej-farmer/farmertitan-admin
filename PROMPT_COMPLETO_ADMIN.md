# PROMPT COMPLETO PARA FARMERTITAN ADMIN

## 🎯 **CONTEXTO GENERAL**

I need to create a complete FarmerTitan Admin Panel - a separate full-stack application for system-wide management. This is NOT for end-user farms, but for our internal team to manage all farms, catalogs, and system data.

**Reference Documentation**: I have a complete specification document that details exactly what this admin panel should do. The admin panel has two main sections:

1. **General Catalogs Section**: For managing equipment types, makes, models, parts, consumables, and maintenance templates
2. **Farm Management Section**: For creating farms, associating users, adding equipment, and viewing usage reports

## 📋 **PROJECT ARCHITECTURE**

- Backend: Node.js + Express + PostgreSQL (Supabase connection)
- Frontend: Vue.js 3 + Composition API + Tailwind CSS + Vue Router
- Database: Connect to existing FarmerTitan PostgreSQL database
- Target: Desktop-only responsive design
- Language: Everything in English

## 🏗️ **BACKEND STRUCTURE REQUIRED**

```
backend/
├── src/
│   ├── database/
│   │   ├── connection.js     # Robust PostgreSQL pool with error logging
│   │   ├── transactions.js   # Transaction management utilities
│   │   └── logger.js         # Database error logging system
│   ├── clients/             # Basic CRUD operations per table
│   │   ├── farmClient.js
│   │   ├── equipmentTypeClient.js
│   │   ├── equipmentMakeClient.js
│   │   ├── equipmentModelClient.js
│   │   ├── equipmentTrimClient.js
│   │   ├── equipmentCatalogClient.js  # _equipment table
│   │   ├── equipmentClient.js
│   │   ├── partTypeClient.js
│   │   ├── consumableTypeClient.js
│   │   ├── taskClient.js
│   │   ├── taskSeriesClient.js
│   │   ├── timeClient.js
│   │   ├── farmUserClient.js
│   │   ├── equipmentUsageTypeClient.js
│   │   ├── equipmentUsageLogClient.js
│   │   └── authUserClient.js
│   ├── services/           # Complex business logic
│   │   ├── maintenanceTemplateService.js  # Complex template creation logic
│   │   ├── equipmentCreationService.js    # Equipment with usage initialization
│   │   ├── farmManagementService.js       # Farm operations with validations
│   │   └── catalogManagementService.js    # Catalog operations with relationships
│   ├── routes/            # REST API endpoints
│   │   ├── catalogs.js    # Equipment types, makes, models, parts, consumables
│   │   ├── maintenance.js # Maintenance templates
│   │   ├── farms.js       # Farm CRUD and management
│   │   └── reports.js     # Farm usage reports
│   ├── middleware/
│   │   ├── validation.js  # Request validation
│   │   └── errorHandler.js # Global error handling
│   └── app.js             # Express app setup
├── package.json
└── .env.example
```

## 🖥️ **FRONTEND STRUCTURE REQUIRED**

```
frontend/
├── src/
│   ├── components/
│   │   ├── shared/        # Reusable components
│   │   │   ├── DataTable.vue      # Generic table with sorting/filtering
│   │   │   ├── FormModal.vue      # Modal for forms
│   │   │   ├── ConfirmDialog.vue  # Confirmation dialogs
│   │   │   ├── LoadingSpinner.vue
│   │   │   └── StatusBadge.vue    # Active/Inactive badges
│   │   ├── catalogs/      # Catalog-specific components
│   │   │   ├── EquipmentTypeForm.vue
│   │   │   ├── EquipmentMakeForm.vue
│   │   │   ├── EquipmentModelForm.vue
│   │   │   ├── EquipmentTrimForm.vue
│   │   │   ├── EquipmentCatalogForm.vue
│   │   │   ├── PartTypeForm.vue
│   │   │   ├── ConsumableTypeForm.vue
│   │   │   ├── MaintenanceTemplateForm.vue  # Complex form
│   │   │   └── CatalogItemsList.vue
│   │   └── farms/         # Farm management components
│   │       ├── FarmForm.vue
│   │       ├── FarmsList.vue
│   │       ├── UserAssociationModal.vue
│   │       ├── EquipmentCreationModal.vue   # Complex equipment creation
│   │       └── FarmUsageReport.vue
│   ├── views/             # Main page views
│   │   ├── Dashboard.vue           # Main dashboard with metrics
│   │   ├── catalogs/
│   │   │   ├── EquipmentTypes.vue
│   │   │   ├── EquipmentMakes.vue
│   │   │   ├── EquipmentModels.vue
│   │   │   ├── EquipmentTrims.vue
│   │   │   ├── EquipmentCatalog.vue  # _equipment table management
│   │   │   ├── PartTypes.vue
│   │   │   ├── ConsumableTypes.vue
│   │   │   └── MaintenanceTemplates.vue
│   │   └── farms/
│   │       ├── FarmsOverview.vue    # All farms list
│   │       └── FarmDetails.vue      # Individual farm management
│   ├── services/
│   │   ├── api.js         # Axios setup with interceptors
│   │   ├── catalogsApi.js # Catalog API calls
│   │   ├── farmsApi.js    # Farm API calls
│   │   └── reportsApi.js  # Reports API calls
│   ├── router/
│   │   └── index.js       # Vue Router setup
│   ├── stores/            # Pinia stores (optional)
│   ├── utils/
│   │   ├── validation.js  # Frontend validation helpers
│   │   └── formatting.js  # Data formatting utilities
│   ├── App.vue
│   └── main.js
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## 🎯 **MAIN FEATURES TO IMPLEMENT**

### **SECTION 1: GENERAL CATALOGS MANAGEMENT**

#### **1.1 Equipment Catalogs**
- **Equipment Types Management**: CRUD operations on `_equipment_type` table
  - Fields: name (required), description (optional)
  - Show list of all equipment types with search and filter
  - Modal form for create/edit

- **Equipment Makes Management**: CRUD operations on `_equipment_make` table  
  - Fields: name (required)
  - Show list of all makes with search and filter
  - Modal form for create/edit

- **Equipment Models Management**: CRUD operations on `_equipment_model` table
  - Fields: name (required), make (dropdown from _equipment_make, required)
  - Show list with make relationship visible
  - Dropdown filtered by selected make

- **Equipment Trims Management**: CRUD operations on `_equipment_trim` table
  - Fields: name (required), make (dropdown, required), model (dropdown filtered by make, required)
  - Show list with make+model relationships visible
  - Cascading dropdowns: make → model

- **Equipment Catalog Management**: CRUD operations on `_equipment` table
  - Fields: type (dropdown from _equipment_type, required), make (dropdown, required), model (dropdown filtered by make, required), trim (dropdown filtered by make+model, optional), year (optional), metadata (JSON, optional)
  - This creates valid combinations for physical equipment creation
  - Show complex relationships in table format

#### **1.2 Parts and Consumables**
- **Part Types Management**: CRUD operations on `_part_type` table
  - Fields: name (required), description (optional)
  - Show list with search functionality

- **Consumable Types Management**: CRUD operations on `_consumable_type` table  
  - Fields: name (required), description (optional)
  - Show list with search functionality

#### **1.3 Maintenance Templates (COMPLEX LOGIC)**
- **Maintenance Templates Management**: Complex creation involving multiple tables
  - **Form Fields**:
    - interval (number, required) - hours or kilometers
    - schedule_type (dropdown: "Hours" or "Kilometers", required)
    - equipment_type (dropdown from _equipment_type, required)
    - maintenance_name (text, required)
    - maintenance_description (text, required)  
    - maintenance_category (dropdown: "Part" or "Consumable", required)
    - part_or_consumable (dropdown based on category, required)
    - specific_equipment (checkbox + dropdown from _equipment, optional)
    - priority (dropdown: low/medium/high, optional)

  - **Complex Save Logic** (execute as transaction):
    ```javascript
    // 1. Create _time record
    INSERT INTO _time (id, type, value, metadata)
    VALUES (uuid, 'schedule:hours'|'schedule:distance', interval_value, metadata_json)
    
    // 2. Create task record  
    INSERT INTO task (id, type, name, description, _equipment_type, _equipment, _part_type, _consumable_type, priority)
    VALUES (uuid, 'template:maintenance', name, description, equipment_type_id, specific_equipment_id, part_type_id, consumable_type_id, priority)
    
    // 3. Create _task_series record
    INSERT INTO _task_series (id, schedule, type, task_template, _equipment_type, _equipment, _part_type, _consumable_type)  
    VALUES (uuid, time_id, 'template:maintenance', task_id, equipment_type_id, specific_equipment_id, part_type_id, consumable_type_id)
    ```

### **SECTION 2: FARM MANAGEMENT**

#### **2.1 Farms Overview**
- **Farms List**: Show all farms from `farm` table
  - Display: name, acres, created date, active status
  - Add "active" boolean field to farm table: `ALTER TABLE farm ADD COLUMN active boolean DEFAULT true`
  - Buttons: "Add Farm", "Manage Farm", "Activate/Deactivate"
  - Status indicators for active/inactive farms

- **Farm Creation**:
  - Fields: name (required, unique), acres (required, decimal), metadata (optional, JSON)
  - Validation: unique farm names
  - Default active = true

- **Farm Activation/Deactivation**:
  - Update active boolean field
  - Validation: inactive farms cannot have new users/equipment added
  - Only allow historical data viewing for inactive farms

#### **2.2 Individual Farm Management** 
For each farm, provide three subsections:

##### **A) Users of the Farm**
- **Show Associated Users**: Query `_farm_user` JOIN `auth.users`
  - Display: user email, role, association date
  - Button: "Associate Existing User" (only if farm is active)
  - Button: "Disassociate User" (with confirmation dialog)

- **Associate User Process**:
  - Dropdown: users from `auth.users` NOT already associated to this farm
  - Fields: user (dropdown, required), role (for now only 'admin')
  - Insert into `_farm_user` table
  - Validation: prevent duplicate associations

- **Disassociate User Process**:
  - Confirmation dialog: "Are you sure you want to disassociate user [email] from farm [farm_name]?"
  - Delete from `_farm_user` table only after confirmation

##### **B) Equipment of the Farm**
- **Show Farm Equipment**: Query `equipment` JOIN `_equipment` with catalog details
  - Display: equipment name, type/make/model, serial number, year, current usage
  - Button: "Add Equipment to Farm" (only if farm is active)

- **Equipment Creation Process (COMPLEX LOGIC)**:
  - **Form Fields**:
    - name (text, required) - custom name for this equipment instance
    - _equipment (dropdown from valid catalog combinations, required)
    - initial_usage_value (number, required)
    - initial_usage_type (dropdown: "Hours", "Kilometers", etc., required)
    - serial_number (text, optional but should be unique per farm)
    - year_purchased (number, optional)
    - metadata (JSON, optional) - warranty, costs, notes

  - **Complex Save Logic** (execute as transaction):
    ```javascript
    // 1. Insert into equipment table
    INSERT INTO equipment (id, name, _equipment, farm, serial_number, year_purchased, metadata)
    
    // 2. Create _time record for initial usage
    INSERT INTO _time (id, type, value, metadata)
    VALUES (uuid, usage_type, initial_value, initial_metadata)
    
    // 3. Create equipment_usage_type association  
    INSERT INTO equipment_usage_type (equipment_id, usage_time_id)
    VALUES (equipment_id, time_id)
    
    // 4. Create equipment_usage_log entry
    INSERT INTO equipment_usage_log (equipment_id, usage_time_id, value, previous_value, reason, created_by)
    VALUES (equipment_id, time_id, initial_value, 0, 'Initial equipment setup', admin_user_id)
    
    // 5. Apply relevant maintenance templates
    // Query _task_series for templates matching this equipment type
    // Create maintenance task instances for this specific equipment
    ```

##### **C) Farm Usage Reports**
- **Metrics Dashboard** for the selected farm:
  - Total equipment count
  - Total associated users count  
  - Open vs closed tasks count
  - Last equipment added date
  - Equipment with overdue maintenance
  - Recent activity (last 30 days)
  - Farm active/inactive status

- **Base Query**:
  ```sql
  WITH farm_metrics AS (
    SELECT 
      f.id, f.name, f.active, f.acres,
      COUNT(DISTINCT e.id) as total_equipment,
      COUNT(DISTINCT fu.id) as total_users,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'open') as open_tasks,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'close') as closed_tasks,
      MAX(e.created_at) as last_equipment_added,
      COUNT(DISTINCT e.id) FILTER (WHERE e.created_at > NOW() - interval '30 days') as new_equipment_month
    FROM farm f
    LEFT JOIN equipment e ON f.id = e.farm
    LEFT JOIN task t ON e.id = t.equipment  
    LEFT JOIN _farm_user fu ON f.id = fu.farm
    WHERE f.id = $farm_id
    GROUP BY f.id, f.name, f.active, f.acres
  )
  SELECT * FROM farm_metrics;
  ```

## 🗄️ **DATABASE CONNECTION & SCHEMA**

### **Connection Requirements**:
- Robust PostgreSQL connection pool with automatic reconnection
- Comprehensive error logging for database operations  
- Transaction support for complex operations
- Connection pooling with proper cleanup

### **Database Credentials (Supabase Local)**:
```
# Direct PostgreSQL Connection
Host: 127.0.0.1
Database: postgres
User: postgres
Password: postgres
Port: 54322

# Supabase API (for future reference)
API URL: http://127.0.0.1:54321
Publishable Key (anon): sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
Secret Key (service_role): sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

### **Existing Database Schema** (key tables):
```sql
-- Main business tables
farm (id, name, acres, metadata) -- NEED TO ADD: active boolean DEFAULT true
equipment (id, name, _equipment, farm, serial_number, year_purchased, metadata)
task (id, type, name, description, _equipment_type, _equipment, _part_type, _consumable_type, priority, status, due_at, completed_at)

-- Catalog tables (prefixed with _)
_equipment_type (id, name, description, created_by, created_in, created_at)
_equipment_make (id, name, created_by, created_in, created_at)
_equipment_model (id, name, make, created_by, created_in, created_at)
_equipment_trim (id, name, make, model, created_by, created_in, created_at)
_equipment (id, type, make, model, trim, year, metadata, created_by, created_in, created_at)
_part_type (id, name, description, created_at)
_consumable_type (id, name, description, created_at)
_task_series (id, schedule, type, task_template, _equipment_type, _equipment, _part_type, _consumable_type, created_at)
_time (id, type, value, metadata, created_at) -- Polymorphic time table
_farm_user (farm, "user", role, created_at)

-- State and audit tables
equipment_usage_type (equipment_id, usage_time_id) -- Current usage state per equipment
equipment_usage_log (id, equipment_id, usage_time_id, value, previous_value, reason, created_by, created_at, is_correction, task_id, metadata)

-- Auth table (Supabase)  
auth.users (id, email, created_at)
```

## ⚙️ **TECHNICAL REQUIREMENTS**

### **Backend Requirements**:
- Robust PostgreSQL connection pool with automatic reconnection
- Comprehensive error logging for all database operations
- Transaction support for complex operations (maintenance templates, equipment creation)
- Input validation on all endpoints
- RESTful API design with proper HTTP status codes
- Global error handling middleware
- Environment variables for configuration
- Proper SQL injection prevention

### **Frontend Requirements**:
- Vue.js 3 with Composition API
- Tailwind CSS for styling
- Vue Router for navigation
- Axios for API communication with interceptors
- Responsive design optimized for desktop (1920x1080+ screens)
- Real-time form validation with clear error messages
- Loading states and success/error notifications
- Data tables with sorting, filtering, and pagination
- Modal forms for create/edit operations
- Confirmation dialogs for destructive operations

### **UI/UX Requirements**:
- Clean, professional admin interface
- Sidebar navigation with sections: Dashboard, Catalogs, Farms
- Breadcrumb navigation
- Data tables with search, sort, and filter capabilities  
- Modal forms for creation/editing
- Status indicators (active/inactive farms, loading states)
- Success/error toast notifications
- Confirmation dialogs with clear messaging
- Form validation with inline error messages
- Professional color scheme suitable for business application

## ✅ **VALIDATION RULES**

### **Business Logic Validations**:
- Farm names must be unique across the system
- Equipment serial numbers must be unique per farm
- Users cannot be associated to the same farm twice  
- Inactive farms cannot have new users/equipment added (only historical viewing)
- Maintenance template intervals must be positive numbers
- Equipment usage initial values must be numeric and positive
- Equipment catalog combinations (type+make+model+trim) should be unique

### **Database Constraints**:
- All UUID fields properly formatted
- Required fields cannot be null
- Foreign key relationships maintained
- Proper enum values for type fields
- Positive numbers for numeric fields (acres, intervals, usage values)

## 🚀 **PROJECT SETUP & DEPENDENCIES**

**IMPORTANT**: This will be a completely new project in an empty directory. You need to:

### **1. Create Complete Project Structure**
Create the full folder structure for both backend and frontend as specified above.

### **2. Backend Dependencies to Install**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0",
    "joi": "^17.9.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.6.0",
    "supertest": "^6.3.0"
  }
}
```

### **3. Frontend Dependencies to Install**
```json
{
  "dependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "axios": "^1.4.0",
    "pinia": "^2.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.0",
    "vite": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### **4. Configuration Files to Create**

**Backend Configuration Files**:
- `package.json` with proper scripts
- `.env.example` with database connection template
- `.gitignore` for Node.js
- `nodemon.json` for development
- Basic `app.js` with Express setup

**Frontend Configuration Files**:
- `package.json` with Vite scripts
- `vite.config.js` with proper Vue setup
- `tailwind.config.js` with admin-friendly theme
- `postcss.config.js`
- `index.html` as entry point
- `.gitignore` for Vue/Vite

### **5. Environment Variables Setup**
Create `.env.example` in backend with:
```
# Database Configuration (Supabase Local)
DB_HOST=127.0.0.1
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=54322
DB_SSL=false

# Supabase Configuration (for future API usage)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# Application Configuration  
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret-here
```

## 🚀 **IMPLEMENTATION PRIORITY**

1. **Complete Project Setup**: 
   - Create both backend and frontend folder structures
   - Generate all package.json files with dependencies
   - Create all necessary configuration files (.env.example, vite.config.js, etc.)
   - Install all npm dependencies
   - Set up basic Express server and Vue.js app

2. **Database Layer**: 
   - Robust PostgreSQL connection pool with error logging
   - Transaction management utilities
   - Database logger setup
   - Test database connection

3. **Basic CRUD Clients**: 
   - Implement all table clients (farmClient.js, equipmentTypeClient.js, etc.)
   - Basic CRUD operations with proper error handling

4. **Complex Services**: 
   - Maintenance templates creation logic
   - Equipment creation with usage initialization
   - Farm management with validation logic

5. **API Routes**: 
   - RESTful endpoints with validation middleware
   - Error handling and logging

6. **Frontend Setup**: 
   - Vue.js 3 app with router configuration
   - Tailwind CSS setup with professional theme
   - Axios configuration with interceptors
   - Basic layout with sidebar navigation

7. **Shared Components**: 
   - DataTable, FormModal, ConfirmDialog components
   - Loading states and notifications

8. **Catalog Management Views**: 
   - Equipment types, makes, models, trims management
   - Parts and consumables management
   - All with proper CRUD operations

9. **Complex Features**: 
   - Maintenance templates creation form and logic
   - Equipment creation with full initialization

10. **Farm Management**: 
    - Farms overview and management
    - User association functionality
    - Equipment assignment to farms

11. **Reports & Dashboard**: 
    - Usage metrics and overview screens
    - Farm-specific reporting

12. **Testing & Polish**: 
    - Error handling, loading states, form validations
    - UI/UX improvements and responsiveness

**START HERE**: Create the complete project structure from scratch, install all dependencies, and set up the basic Express server and Vue.js application. Make sure both backend and frontend can run successfully before proceeding to database implementation.