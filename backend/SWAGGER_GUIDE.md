# Swagger/OpenAPI Documentation Guide

This guide explains how to document API endpoints using Swagger/OpenAPI 3.0 in this project.

## Overview

We use `swagger-jsdoc` to generate OpenAPI documentation from JSDoc comments in our route files. The Swagger UI is available at `/api-docs` when the server is running.

## Configuration

Swagger is configured in `/src/config/swagger.js`. This file defines:
- API metadata (title, version, description)
- Server URLs (development & production)
- Security schemes (JWT Bearer auth)
- Reusable schemas and responses
- Tags for organizing endpoints

## How to Document Endpoints

### Basic Structure

Add JSDoc comments above route handlers in `/src/routes/*.js` files:

```javascript
/**
 * @swagger
 * /api/resource:
 *   get:
 *     summary: Short description
 *     description: Detailed description
 *     tags: [TagName]
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/resource', handler);
```

### Complete Example

Here's a complete example with all common patterns:

```javascript
/**
 * @swagger
 * /api/farms:
 *   post:
 *     summary: Create a new farm
 *     description: Creates a new farm with the provided information. Requires authentication.
 *     tags: [Farms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *                 example: Green Valley Farm
 *                 description: Farm name
 *               location:
 *                 type: string
 *                 example: Santa Cruz, CA
 *               area:
 *                 type: number
 *                 minimum: 0
 *                 example: 150.5
 *                 description: Farm area in hectares
 *     responses:
 *       201:
 *         description: Farm created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Farm'
 *                 message:
 *                   type: string
 *                   example: Farm created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', verifyToken, requireAuth, validateFarm, asyncHandler(async (req, res) => {
  // handler code
}));
```

## Common Patterns

### Path Parameters

```javascript
parameters:
  - in: path
    name: id
    required: true
    schema:
      type: string
      format: uuid
    description: Resource ID
```

### Query Parameters

```javascript
parameters:
  - in: query
    name: page
    schema:
      type: integer
      default: 1
    description: Page number
  - in: query
    name: search
    schema:
      type: string
    description: Search term
```

### Request Body

```javascript
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - fieldName
        properties:
          fieldName:
            type: string
            example: Example value
```

### Using Reusable Schemas

Reference schemas defined in `swagger.js`:

```javascript
responses:
  200:
    description: Success
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Farm'
```

Available schemas:
- `Farm`
- `Equipment`
- `EquipmentMake`
- `EquipmentModel`
- `Batch`
- `Error`
- `PaginatedResponse`

### Using Reusable Responses

```javascript
responses:
  401:
    $ref: '#/components/responses/UnauthorizedError'
  404:
    $ref: '#/components/responses/NotFoundError'
  400:
    $ref: '#/components/responses/ValidationError'
```

### Pagination Response

```javascript
responses:
  200:
    description: Paginated list
    content:
      application/json:
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                $ref: '#/components/schemas/Farm'
            pagination:
              type: object
              properties:
                page:
                  type: integer
                limit:
                  type: integer
                total:
                  type: integer
                totalPages:
                  type: integer
```

### File Upload

```javascript
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file:
            type: string
            format: binary
            description: CSV file to upload
```

### Authentication

Most endpoints require authentication. Add this:

```javascript
security:
  - bearerAuth: []
```

To skip authentication (public endpoints):

```javascript
security: []
```

## Available Tags

Use these tags to organize endpoints:

- `Authentication` - Login, register, token refresh
- `Farms` - Farm management
- `Equipment` - Equipment inventory
- `Catalogs` - Makes, models, types, trims
- `Maintenance` - Maintenance schedules
- `QR Codes` - QR code generation
- `Batches` - Production batches
- `Suppliers` - Supplier management
- `Health` - Health check endpoints

## Data Types

Common OpenAPI data types:

- `string` - Text
- `integer` - Whole numbers
- `number` - Decimals
- `boolean` - true/false
- `array` - Lists
- `object` - JSON objects

### String Formats

- `date` - ISO date (2024-01-15)
- `date-time` - ISO datetime (2024-01-15T10:30:00Z)
- `email` - Email address
- `uuid` - UUID format
- `uri` - URL format
- `binary` - File upload

## Best Practices

### 1. Always Include

- `summary` - Brief description (< 50 chars)
- `description` - Detailed explanation
- `tags` - For organization
- All possible response codes
- Example values

### 2. Be Specific

```javascript
// ❌ Bad
description: "Gets data"

// ✅ Good
description: "Retrieves a paginated list of farms with optional search filtering by name or location"
```

### 3. Document All Parameters

```javascript
// ❌ Bad
parameters:
  - in: query
    name: filter

// ✅ Good
parameters:
  - in: query
    name: filter
    schema:
      type: string
      enum: [active, inactive, maintenance]
    description: Filter equipment by status
    example: active
```

### 4. Use Examples

Always provide realistic examples:

```javascript
example: "Green Valley Farm"
```

### 5. Document Error Responses

Always document error cases:

```javascript
responses:
  200:
    description: Success
  400:
    description: Invalid input
  401:
    description: Unauthorized
  404:
    description: Not found
  500:
    description: Server error
```

## Testing Your Documentation

### 1. Start the Server

```bash
cd backend
npm run dev
```

### 2. Open Swagger UI

Visit: http://localhost:3000/api-docs

### 3. Test Endpoints

- Click "Authorize" to add your JWT token
- Expand any endpoint
- Click "Try it out"
- Fill parameters
- Click "Execute"

### 4. View JSON Spec

Visit: http://localhost:3000/api-docs.json

## Adding New Schemas

To add reusable schemas, edit `/src/config/swagger.js`:

```javascript
components: {
  schemas: {
    YourNewSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid'
        },
        name: {
          type: 'string'
        }
      }
    }
  }
}
```

Then reference it:

```javascript
schema:
  $ref: '#/components/schemas/YourNewSchema'
```

## Common Issues

### Issue: Documentation not showing

**Solution:**
- Restart the server
- Check JSDoc syntax (missing asterisks, colons)
- Verify file is in `./src/routes/*.js`

### Issue: Schema not found

**Solution:**
- Check spelling of schema name
- Verify it's defined in `swagger.js`
- Use exact case-sensitive name

### Issue: Authentication not working in Swagger UI

**Solution:**
1. Get a valid JWT token from `/api/auth/login`
2. Click "Authorize" button in Swagger UI
3. Enter: `Bearer <your-token>`
4. Click "Authorize"

## Documentation Checklist

When documenting an endpoint, ensure:

- [ ] Summary is clear and concise
- [ ] Description explains what the endpoint does
- [ ] Correct tag is assigned
- [ ] All parameters are documented
- [ ] Request body schema is complete
- [ ] All response codes are documented
- [ ] Examples are provided
- [ ] Authentication requirements are specified
- [ ] Tested in Swagger UI

## Examples by HTTP Method

### GET (List)

```javascript
/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: List all resources
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Success
 */
```

### GET (Single)

```javascript
/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Not found
 */
```

### POST (Create)

```javascript
/**
 * @swagger
 * /api/resources:
 *   post:
 *     summary: Create new resource
 *     tags: [Resources]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
```

### PUT (Update)

```javascript
/**
 * @swagger
 * /api/resources/{id}:
 *   put:
 *     summary: Update resource
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
```

### DELETE

```javascript
/**
 * @swagger
 * /api/resources/{id}:
 *   delete:
 *     summary: Delete resource
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
```

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger JSDoc Documentation](https://github.com/Swagger-api/swagger-jsdoc)
- [Swagger Editor](https://editor.swagger.io/) - Online editor for testing YAML/JSON

## Contributing

When adding new endpoints:

1. Document them immediately (don't leave for later)
2. Follow the patterns in this guide
3. Test in Swagger UI before committing
4. Use consistent naming and formatting

---

**Need Help?** Check existing route files for examples or ask in the team chat!
