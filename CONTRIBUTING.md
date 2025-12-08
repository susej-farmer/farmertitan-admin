# Contributing to FarmerTitan Admin

Thank you for your interest in contributing to FarmerTitan Admin! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Questions and Support](#questions-and-support)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or derogatory comments
- Personal or political attacks
- Publishing others' private information without permission
- Any conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0 (or Supabase account)
- **Git**

### Fork and Clone

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:

```bash
git clone git@github.com:your-username/farmertitan-admin.git
cd farmertitan-admin
```

3. **Add upstream remote**:

```bash
git remote add upstream git@github.com:original-org/farmertitan-admin.git
```

### Setup Development Environment

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Keep Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/my-feature-name
```

**Branch Naming Convention:**

- `feature/` - New features (e.g., `feature/add-batch-filtering`)
- `fix/` - Bug fixes (e.g., `fix/authentication-error`)
- `docs/` - Documentation updates (e.g., `docs/update-api-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-batch-service`)
- `test/` - Adding or updating tests (e.g., `test/add-farm-api-tests`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed
- Ensure your code doesn't break existing functionality

### 3. Test Your Changes

#### Backend

```bash
cd backend
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run dev                 # Manual testing
```

#### Frontend

```bash
cd frontend
npm run lint                # Check code style
npm run dev                 # Manual testing in browser
```

### 4. Commit Your Changes

Follow the [Commit Convention](#commit-convention) below.

### 5. Push and Create Pull Request

```bash
git push origin feature/my-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### Backend (Node.js/Express)

#### General Guidelines

- Use **ES6+ features** (async/await, arrow functions, destructuring)
- Follow the **3-layer architecture**: Routes → Services → Clients
- Keep functions **small and focused** (single responsibility)
- Use **meaningful variable names** (no single letters except loop counters)
- Add **JSDoc comments** for complex functions
- Handle **errors properly** (use try/catch and error middleware)

#### File Organization

```javascript
// 1. Imports
const express = require('express');
const { farmService } = require('../services/farmService');

// 2. Constants
const ITEMS_PER_PAGE = 20;

// 3. Functions
async function getFarms(req, res, next) {
  try {
    // implementation
  } catch (error) {
    next(error);
  }
}

// 4. Exports
module.exports = { getFarms };
```

#### Naming Conventions

- **Files**: camelCase (e.g., `farmService.js`, `batchClient.js`)
- **Functions**: camelCase (e.g., `getFarms`, `createBatch`)
- **Classes**: PascalCase (e.g., `FarmService`, `BatchClient`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_UPLOAD_SIZE`)
- **Private functions**: prefix with `_` (e.g., `_validateInput`)

#### Code Examples

**Good:**

```javascript
// ✅ Clear, descriptive function with error handling
async function getFarmById(farmId) {
  if (!farmId) {
    throw new Error('Farm ID is required');
  }

  const farm = await farmClient.findById(farmId);

  if (!farm) {
    throw new Error('Farm not found');
  }

  return farm;
}
```

**Bad:**

```javascript
// ❌ Vague naming, no error handling
async function get(id) {
  return await db.query('SELECT * FROM farms WHERE id = $1', [id]);
}
```

### Frontend (Vue.js 3)

#### General Guidelines

- Use **Vue 3 Composition API** (not Options API)
- Use **`<script setup>`** syntax
- Follow **single-responsibility principle** for components
- Use **Tailwind CSS** for styling (avoid custom CSS when possible)
- Keep components **under 300 lines**
- Extract reusable logic into **composables**

#### Component Structure

```vue
<script setup>
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { farmsApi } from '@/services/farmsApi'

// 2. Props & Emits
const props = defineProps({
  farmId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update', 'delete'])

// 3. State
const loading = ref(false)
const farm = ref(null)

// 4. Computed
const farmName = computed(() => farm.value?.name || 'Unknown')

// 5. Methods
const fetchFarm = async () => {
  loading.value = true
  try {
    const response = await farmsApi.getFarm(props.farmId)
    farm.value = response.data
  } catch (error) {
    console.error('Error fetching farm:', error)
  } finally {
    loading.value = false
  }
}

// 6. Lifecycle
onMounted(fetchFarm)
</script>

<template>
  <div v-if="loading" class="flex justify-center items-center">
    <span class="text-gray-500">Loading...</span>
  </div>

  <div v-else-if="farm" class="p-4">
    <h1 class="text-2xl font-bold">{{ farmName }}</h1>
    <!-- Component content -->
  </div>
</template>
```

#### Naming Conventions

- **Components**: PascalCase (e.g., `FarmList.vue`, `EquipmentCard.vue`)
- **Composables**: camelCase with `use` prefix (e.g., `useFarms.js`, `useAuth.js`)
- **Props**: camelCase (e.g., `farmId`, `isActive`)
- **Events**: kebab-case (e.g., `@update-farm`, `@delete-item`)

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, whitespace)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build config)

### Scopes (Optional)

- **backend**: Backend-related changes
- **frontend**: Frontend-related changes
- **api**: API endpoint changes
- **db**: Database changes
- **docs**: Documentation changes

### Examples

```bash
# New feature
git commit -m "feat(backend): add batch filtering endpoint"

# Bug fix
git commit -m "fix(frontend): resolve pagination issue in catalog view"

# Documentation
git commit -m "docs: update API documentation for farm endpoints"

# Multiple changes
git commit -m "feat(backend): add batch filtering

- Add query parameters for date range
- Implement pagination
- Add sorting by created_at
- Update API documentation"

# Breaking change
git commit -m "feat(api)!: change authentication flow

BREAKING CHANGE: JWT tokens now expire after 1 hour instead of 24 hours"
```

### Commit Message Guidelines

- Use imperative mood ("add feature" not "added feature")
- Keep subject line under 72 characters
- Capitalize first letter of subject
- Don't end subject line with a period
- Separate subject from body with a blank line
- Use body to explain **what** and **why**, not **how**

## Pull Request Process

### Before Submitting

1. ✅ **Test your changes** thoroughly
2. ✅ **Run linting** and fix any issues
3. ✅ **Update documentation** if needed
4. ✅ **Ensure tests pass** (backend only for now)
5. ✅ **Rebase** on latest main branch
6. ✅ **Write clear commit messages** following convention

### PR Title

Use the same convention as commit messages:

```
feat(backend): add batch filtering endpoint
fix(frontend): resolve pagination bug
docs: update installation instructions
```

### PR Description

Use this template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- Bullet point list of changes
- Include technical details
- Mention any dependencies

## How to Test
1. Step-by-step instructions
2. How to verify the changes work
3. Edge cases to check

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have tested my changes
- [ ] I have updated the documentation
- [ ] My changes don't break existing functionality
- [ ] I have added tests for new features (backend)
```

### Review Process

1. **Automated checks** will run (linting, tests)
2. **Code review** by maintainers
3. **Requested changes** must be addressed
4. Once approved, **maintainers will merge** your PR

### After Your PR is Merged

1. Delete your feature branch (GitHub will prompt you)
2. Pull the latest main branch locally:

```bash
git checkout main
git pull upstream main
```

## Testing Guidelines

### Backend Testing

We use **Jest** and **Supertest** for testing.

#### Unit Tests

Test individual functions and services:

```javascript
describe('farmService', () => {
  describe('getFarmById', () => {
    it('should return farm when found', async () => {
      const farm = await farmService.getFarmById('123');
      expect(farm).toBeDefined();
      expect(farm.id).toBe('123');
    });

    it('should throw error when farm not found', async () => {
      await expect(farmService.getFarmById('invalid'))
        .rejects
        .toThrow('Farm not found');
    });
  });
});
```

#### Integration Tests

Test API endpoints:

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/farms', () => {
  it('should return list of farms', async () => {
    const response = await request(app)
      .get('/api/farms')
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
  });

  it('should require authentication', async () => {
    await request(app)
      .get('/api/farms')
      .expect(401);
  });
});
```

#### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm test -- --coverage   # With coverage report
```

### Frontend Testing

Currently manual testing. Automated testing contributions are welcome!

**Planned:**
- **Vitest** for unit tests
- **Vue Test Utils** for component tests
- **Playwright/Cypress** for E2E tests

## Working with Database Migrations

### ⚠️ IMPORTANT: Never Modify Database Directly

**❌ NEVER do this:**
- Edit tables directly in Supabase Studio
- Run SQL commands manually in production
- Change schema without creating a migration

**✅ ALWAYS create migrations for database changes**

### Creating a New Migration

When you need to change the database schema:

**1. Create a new migration file:**
```bash
supabase migration new add_status_to_equipment
```

This creates: `supabase/migrations/20241208123456_add_status_to_equipment.sql`

**2. Write your SQL in the migration file:**
```sql
-- Add status column to equipment table
ALTER TABLE equipment ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Add check constraint
ALTER TABLE equipment ADD CONSTRAINT check_status
  CHECK (status IN ('active', 'maintenance', 'retired'));

-- Create index for better performance
CREATE INDEX idx_equipment_status ON equipment(status);
```

**3. Test your migration locally:**
```bash
# Apply the migration
supabase db reset

# Verify it worked
supabase db diff  # Should show no differences
```

**4. Commit the migration:**
```bash
git add supabase/migrations/
git commit -m "feat(db): add status column to equipment table"
```

### Migration Best Practices

#### Writing Safe Migrations

**DO:**
- Use `IF NOT EXISTS` for CREATE statements
- Use `IF EXISTS` for DROP statements
- Add `DEFAULT` values when adding NOT NULL columns
- Create indexes for foreign keys and frequently queried columns
- Write reversible migrations when possible

```sql
-- ✅ Safe migration
ALTER TABLE farm ADD COLUMN IF NOT EXISTS region VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_farm_region ON farm(region);
```

**DON'T:**
- Drop columns with data (archive instead)
- Remove constraints without understanding impact
- Run migrations that lock tables for long periods
- Forget to test rollback scenarios

```sql
-- ❌ Dangerous - loses data
ALTER TABLE farm DROP COLUMN region;
```

#### Migration Naming

Use descriptive names:

```bash
# Good
supabase migration new add_payment_status_to_orders
supabase migration new create_audit_logs_table
supabase migration new add_index_to_user_email

# Bad
supabase migration new update_db
supabase migration new fix
supabase migration new changes
```

### Applying Migrations in Different Environments

#### Local Development

```bash
# Apply all pending migrations
supabase db reset

# OR apply without resetting data
supabase migration up
```

#### After Pulling Changes

When you `git pull` and see new migrations:

```bash
# Reset database to apply new migrations
supabase db reset

# Your local data will be replaced with seed data
# If you need to keep local data, use:
supabase migration up
```

#### Cloud/Production

```bash
# Link to your project (first time only)
supabase link --project-ref your-project-id

# Push migrations to production
supabase db push
```

### Common Migration Scenarios

#### Adding a Column

```sql
-- Migration: add_email_to_suppliers.sql
ALTER TABLE suppliers
  ADD COLUMN email VARCHAR(255);

-- Add index if you'll query by email
CREATE INDEX idx_suppliers_email ON suppliers(email);
```

#### Creating a New Table

```sql
-- Migration: create_notifications_table.sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

#### Adding a Foreign Key

```sql
-- Migration: add_farm_id_to_equipment.sql
-- First, add the column
ALTER TABLE equipment
  ADD COLUMN farm_id UUID;

-- Then add the foreign key constraint
ALTER TABLE equipment
  ADD CONSTRAINT fk_equipment_farm
  FOREIGN KEY (farm_id)
  REFERENCES farm(id)
  ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_equipment_farm_id ON equipment(farm_id);
```

#### Renaming a Column (Safe Way)

```sql
-- Migration: rename_acres_to_area.sql
-- Step 1: Add new column
ALTER TABLE farm ADD COLUMN area DECIMAL(10,2);

-- Step 2: Copy data
UPDATE farm SET area = acres WHERE area IS NULL;

-- Step 3: Drop old column (in a separate migration later)
-- This allows for safe rollback
```

### Handling Data Migrations

When you need to transform existing data:

```sql
-- Migration: populate_equipment_status.sql
-- Set default status for existing equipment
UPDATE equipment
SET status = 'active'
WHERE status IS NULL;

-- Now make it NOT NULL
ALTER TABLE equipment
  ALTER COLUMN status SET NOT NULL;
```

### Troubleshooting Migrations

#### Migration Failed

```bash
# Check what went wrong
supabase db diff

# Reset and try again
supabase db reset

# If that doesn't work, check migration file for syntax errors
```

#### Rollback a Migration

```bash
# There's no built-in rollback, so:
# 1. Delete the migration file
rm supabase/migrations/20241208123456_bad_migration.sql

# 2. Reset database
supabase db reset
```

#### Migration Conflicts

If two developers create migrations simultaneously:

```bash
# 1. Pull latest changes
git pull

# 2. Rename your migration with a later timestamp
# Migrations run in alphabetical order by filename

# 3. Test that all migrations work together
supabase db reset
```

### Migration Checklist

Before committing a migration:

- [ ] Migration file has descriptive name
- [ ] SQL uses `IF NOT EXISTS` / `IF EXISTS` where appropriate
- [ ] Added indexes for new foreign keys
- [ ] Tested locally with `supabase db reset`
- [ ] Verified no data loss
- [ ] Documented any manual steps needed
- [ ] Considered impact on existing data
- [ ] PR includes migration in the changeset

### Pull Request Guidelines for DB Changes

When your PR includes database changes:

**In PR Description:**
```markdown
## Database Changes

- Added `status` column to `equipment` table
- Created index on `equipment.status`

## Migration Steps

1. Migration will run automatically via `supabase db reset`
2. No manual intervention needed
3. Seed data updated to include status values

## Rollback Plan

If issues arise:
1. Revert this commit
2. Run `supabase db reset`

## Testing

- [ ] Tested migration locally
- [ ] Verified existing data not affected
- [ ] Confirmed indexes created successfully
```

## Documentation

### When to Update Documentation

- Adding new features or endpoints
- Changing existing functionality
- Adding new configuration options
- Fixing bugs that affect documented behavior

### Documentation Files

- **README.md** - Setup and general information
- **API Documentation** - Endpoint specifications
- **CONTRIBUTING.md** - This file
- **Code Comments** - JSDoc for complex functions

### API Documentation

Document endpoints in the code using JSDoc comments:

```javascript
/**
 * Get all farms with optional filtering
 * @route GET /api/farms
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.search - Search term
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Items per page (default: 20)
 * @returns {Object} Paginated list of farms
 * @throws {400} Invalid query parameters
 * @throws {401} Unauthorized
 */
async function getFarms(req, res, next) {
  // implementation
}
```

## Questions and Support

### How to Ask Questions

1. **Check existing documentation** first
2. **Search GitHub issues** for similar questions
3. **Open a new issue** with the "question" label
4. **Join our community** (if applicable)

### Reporting Bugs

When reporting bugs, include:

- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, browser)
- Screenshots or error logs if applicable

### Requesting Features

When requesting features:

- Check if it already exists or is planned
- Explain the use case and why it's valuable
- Provide examples of how it would work
- Consider contributing the implementation yourself!

## License

By contributing to FarmerTitan Admin, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to FarmerTitan Admin!**

Your contributions help make farming technology better for everyone.
