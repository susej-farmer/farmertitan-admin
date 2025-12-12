# Multi-Environment Database Configuration

## Overview

El backend ahora soporta conexiones a múltiples bases de datos según el ambiente especificado en cada request mediante el header `X-Environment`.

## Ambientes Soportados

1. **local** - Ambiente de desarrollo local (default)
2. **development** - Ambiente de desarrollo/staging
3. **production** - Ambiente de producción

## Cómo Funciona

### 1. Header X-Environment

Cada request puede incluir el header `X-Environment` para especificar a qué base de datos conectarse:

```bash
# Conectar a la BD local
curl -H "X-Environment: local" http://localhost:3000/api/...

# Conectar a la BD de development
curl -H "X-Environment: development" http://localhost:3000/api/...

# Conectar a la BD de production
curl -H "X-Environment: production" http://localhost:3000/api/...
```

### 2. Comportamiento Default

Si no se especifica el header `X-Environment`, el sistema usa **local** por default:

```bash
# Esto usará el ambiente 'local'
curl http://localhost:3000/api/...
```

## Configuración

### Paso 1: Variables de Entorno

Actualiza tu archivo `.env` con las credenciales de cada ambiente:

```bash
# =============================================================================
# LOCAL Environment (Default)
# =============================================================================
SUPABASE_URL_LOCAL=http://localhost:54321
SUPABASE_ANON_KEY_LOCAL=eyJhbGc...
SUPABASE_SERVICE_KEY_LOCAL=eyJhbGc...

# =============================================================================
# DEVELOPMENT Environment
# =============================================================================
SUPABASE_URL_DEV=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY_DEV=eyJhbGc...
SUPABASE_SERVICE_KEY_DEV=eyJhbGc...

# =============================================================================
# PRODUCTION Environment
# =============================================================================
SUPABASE_URL_PROD=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY_PROD=eyJhbGc...
SUPABASE_SERVICE_KEY_PROD=eyJhbGc...
```

### Paso 2: Fallback Configuration

También puedes configurar valores por defecto que se usarán si no existen las variables específicas del ambiente:

```bash
# Fallback values (opcional)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

## Ejemplos de Uso

### Con cURL

```bash
# Login usando BD local
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Environment: local" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login usando BD de production
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Environment: production" \
  -d '{"email":"user@example.com","password":"password123"}'

# Obtener catálogo de equipos en development
curl http://localhost:3000/api/catalogs/equipment-types \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Environment: development"
```

### Con JavaScript/Fetch

```javascript
// Configurar cliente API
const API_BASE_URL = 'http://localhost:3000/api';

// Helper para hacer requests con ambiente específico
async function apiRequest(endpoint, options = {}) {
  const environment = 'production'; // o 'local', 'development'

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Environment': environment,
      ...options.headers
    }
  });

  return response.json();
}

// Login en production
const loginData = await apiRequest('/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Obtener equipos en development
const equipment = await apiRequest('/catalogs/equipment-types', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Environment': 'development'
  }
});
```

### Con Axios

```javascript
import axios from 'axios';

// Crear instancia de axios para cada ambiente
const createApiClient = (environment = 'local') => {
  return axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
      'Content-Type': 'application/json',
      'X-Environment': environment
    }
  });
};

// Cliente para production
const prodApi = createApiClient('production');

// Cliente para development
const devApi = createApiClient('development');

// Usar los clientes
const loginResponse = await prodApi.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const equipmentResponse = await devApi.get('/catalogs/equipment-types', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Con Postman

1. Crear una nueva request
2. En la pestaña "Headers", agregar:
   - Key: `X-Environment`
   - Value: `local`, `development`, o `production`
3. Hacer la request normalmente

## Arquitectura

### Archivos Creados

```
src/
├── config/
│   └── database.js          # Configuración de ambientes
├── middleware/
│   └── environment.js       # Middleware para leer X-Environment
└── clients/
    └── supabaseClient.js    # Cliente dinámico de Supabase
```

### Flujo de Request

1. **Request llega al servidor**
   ```
   GET /api/catalogs/equipment-types
   Headers: { X-Environment: "production" }
   ```

2. **Middleware setEnvironment**
   - Lee el header `X-Environment`
   - Valida que sea un ambiente válido
   - Obtiene la configuración del ambiente
   - Adjunta `req.environment` y `req.dbConfig` al request

3. **Route Handler**
   - Usa `req.dbConfig` para crear conexión a Supabase
   - Ejecuta queries contra la BD correcta
   - Retorna respuesta

### Diagrama de Flujo

```
┌─────────────────┐
│  Client Request │
│  X-Environment: │
│   "production"  │
└────────┬────────┘
         │
         v
┌─────────────────────┐
│ setEnvironment      │
│ Middleware          │
│ - Validate header   │
│ - Load config       │
│ - Attach to req     │
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│ Route Handler       │
│ - Get Supabase      │
│   client from req   │
│ - Query DB          │
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│ Supabase Client     │
│ (Production DB)     │
└─────────────────────┘
```

## Seguridad

### Validación de Ambientes

El middleware valida que el valor del header sea uno de los ambientes permitidos:

```javascript
// Valores válidos
X-Environment: local
X-Environment: development
X-Environment: production

// Valores inválidos (se usa 'local' por default)
X-Environment: staging      // Inválido
X-Environment: test         // Inválido
X-Environment: prod         // Inválido (debe ser 'production')
```

### Logs

En modo desarrollo, el middleware registra qué ambiente se está usando:

```
[Environment] Request using: production
```

### Restricción por Ambiente

Puedes restringir ciertas operaciones a ambientes específicos:

```javascript
const { requireEnvironment } = require('../middleware/environment');

// Solo permitir en production
router.delete('/critical-data/:id',
  verifyToken,
  requireAuth,
  requireEnvironment('production'),
  asyncHandler(async (req, res) => {
    // Solo se ejecuta si X-Environment: production
  })
);

// Permitir en múltiples ambientes
router.post('/test-endpoint',
  requireEnvironment(['local', 'development']),
  asyncHandler(async (req, res) => {
    // Solo funciona en local o development
  })
);
```

## Testing

### Prueba de Ambientes

```bash
# Test 1: Verificar ambiente local (default)
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test 2: Verificar ambiente development
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Environment: development" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test 3: Verificar ambiente production
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Environment: production" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test 4: Verificar ambiente inválido (debe usar local)
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Environment: invalid" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Script de Testing

```bash
#!/bin/bash

echo "Testing multi-environment setup..."

# Test local
echo "\n1. Testing LOCAL environment..."
curl -s http://localhost:3000/health | jq

# Test development
echo "\n2. Testing DEVELOPMENT environment..."
curl -s -H "X-Environment: development" http://localhost:3000/health | jq

# Test production
echo "\n3. Testing PRODUCTION environment..."
curl -s -H "X-Environment: production" http://localhost:3000/health | jq

echo "\n✓ All tests completed"
```

## Troubleshooting

### Error: Missing required Supabase configuration

```
Error: Missing required Supabase configuration for environment: production
```

**Solución:** Verifica que hayas configurado las variables de entorno para ese ambiente en tu `.env`:

```bash
SUPABASE_URL_PROD=...
SUPABASE_SERVICE_KEY_PROD=...
```

### Warning: Invalid X-Environment header value

```
Invalid X-Environment header value: "prod". Valid values are: local, development, production. Defaulting to "local".
```

**Solución:** Usa uno de los valores válidos: `local`, `development`, o `production`.

### No dbConfig found in request

```
No dbConfig found in request. Falling back to default environment.
```

**Solución:** Asegúrate de que el middleware `setEnvironment` esté configurado en `app.js` **antes** de las rutas:

```javascript
// Correcto
app.use(setEnvironment);
app.use('/api/auth', require('./routes/auth'));

// Incorrecto
app.use('/api/auth', require('./routes/auth'));
app.use(setEnvironment); // Muy tarde!
```

## Migración desde Configuración Simple

Si ya tienes un `.env` existente, puedes mantener la retrocompatibilidad:

```bash
# Configuración antigua (sigue funcionando)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# El sistema usará estas variables si no existen las específicas del ambiente
```

## Best Practices

1. **Nunca commitear credenciales**
   - Agrega `.env` a `.gitignore`
   - Usa `.env.example` como template

2. **Usar ambiente correcto en frontend**
   ```javascript
   const ENVIRONMENT = process.env.NODE_ENV === 'production'
     ? 'production'
     : 'local';
   ```

3. **Logs en desarrollo, silencio en producción**
   - Los logs de ambiente solo se muestran en desarrollo
   - En producción, los logs son mínimos

4. **Validar configuración al inicio**
   ```javascript
   const { validateEnvironmentConfig } = require('./config/database');

   // En app.js
   try {
     validateEnvironmentConfig('production');
     console.log('✓ Production config is valid');
   } catch (error) {
     console.error('✗ Production config error:', error.message);
   }
   ```

## Preguntas Frecuentes

### ¿Puedo usar otros nombres de ambientes?

No, los únicos ambientes soportados son: `local`, `development`, y `production`. Si necesitas otros, debes modificar `src/config/database.js`.

### ¿Qué pasa si no configuro todos los ambientes?

Solo necesitas configurar los ambientes que vas a usar. Si solo usas `local`, solo configura esas variables.

### ¿Puedo cambiar el ambiente en runtime?

Sí, cada request puede usar un ambiente diferente mediante el header `X-Environment`.

### ¿Afecta el performance?

No. El middleware es muy ligero y solo lee el header y la configuración. No hay impacto significativo en el performance.

## Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.
