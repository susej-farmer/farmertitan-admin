# GET /api/farms - Documentación Completa

## Descripción
Endpoint para obtener todas las granjas con paginación, búsqueda y filtros. Utiliza la función PostgreSQL `get_farms_with_context` que retorna granjas con conteos de equipos y usuarios.

---

## Endpoint
```
GET http://localhost:3000/api/farms
```

---

## Headers Requeridos
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Query Parameters

| Parámetro   | Tipo    | Requerido | Default | Descripción                                      | Ejemplo                               |
|-------------|---------|-----------|---------|--------------------------------------------------|---------------------------------------|
| `page`      | integer | No        | `1`     | Número de página (mínimo 1)                     | `?page=2`                            |
| `limit`     | integer | No        | `20`    | Elementos por página (entre 1 y 100)            | `?limit=25`                          |
| `search`    | string  | No        | `null`  | Búsqueda por nombre de granja (case-insensitive) | `?search=norte`                      |
| `is_active` | boolean | No        | `null`  | Filtrar por estado activo (`true`/`false`)       | `?is_active=true`                    |
| `user_id`   | UUID    | No        | `null`  | Filtrar granjas donde el usuario es miembro      | `?user_id=uuid-del-usuario`          |

---

## Respuestas Posibles

### ✅ 200 OK - Éxito

#### Estructura de Respuesta
```json
{
  "success": true,
  "data": [
    {
      "id": "14d085fb-0b58-4f75-ac88-effc8d2f150c",
      "created_at": "2025-11-01T10:30:00.000Z",
      "name": "Granja Norte",
      "acres": 150.5,
      "status": true,
      "metadata": {
        "region": "norte",
        "established": "2020"
      },
      "equipment_count": 15,
      "user_count": 8
    },
    {
      "id": "24d085fb-0b58-4f75-ac88-effc8d2f150d",
      "created_at": "2025-10-15T14:20:00.000Z",
      "name": "Granja Sur",
      "acres": 200.0,
      "status": true,
      "metadata": {},
      "equipment_count": 22,
      "user_count": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  },
  "metadata": {
    "timestamp": "2025-12-08T15:30:00.000Z",
    "operation": "get_farms_with_context",
    "filters": {
      "search": null,
      "is_active": true,
      "user_id": null
    }
  }
}
```

#### Campos de Respuesta

**`data` (array)**: Array de granjas con los siguientes campos:
- `id` (UUID): Identificador único de la granja
- `created_at` (timestamp): Fecha de creación
- `name` (string): Nombre de la granja
- `acres` (decimal): Acres de la granja
- `status` (boolean): Estado activo/inactivo
- `metadata` (jsonb): Metadatos adicionales
- `equipment_count` (integer): **Cantidad de equipos en la granja**
- `user_count` (integer): **Cantidad de usuarios asignados a la granja**

**`pagination` (object)**: Información de paginación
- `page` (integer): Página actual
- `limit` (integer): Elementos por página
- `total` (integer): Total de granjas
- `total_pages` (integer): Total de páginas
- `has_next` (boolean): Indica si hay página siguiente
- `has_prev` (boolean): Indica si hay página anterior

**`metadata` (object)**: Metadatos de la operación
- `timestamp` (timestamp): Momento de ejecución
- `operation` (string): Nombre de la función ejecutada
- `filters` (object): Filtros aplicados

---

### ❌ 400 Bad Request - Parámetros Inválidos

#### 1. Página Inválida
```json
{
  "success": false,
  "error_code": "INVALID_PAGE",
  "error_message": "Page number must be greater than or equal to 1",
  "metadata": {
    "timestamp": "2025-12-08T15:30:00.000Z",
    "operation": "get_farms_with_context",
    "provided_page": 0
  }
}
```

#### 2. Limit Inválido
```json
{
  "success": false,
  "error_code": "INVALID_LIMIT",
  "error_message": "Limit must be between 1 and 100",
  "metadata": {
    "timestamp": "2025-12-08T15:30:00.000Z",
    "operation": "get_farms_with_context",
    "provided_limit": 150
  }
}
```

---

### ❌ 401 Unauthorized - No Autenticado
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication token is required"
}
```

---

### ❌ 403 Forbidden - Token Inválido
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Invalid or expired token"
}
```

---

### ❌ 500 Internal Server Error - Error del Servidor
```json
{
  "success": false,
  "error_code": "UNEXPECTED_ERROR",
  "error_message": "Database connection failed",
  "error_state": "08006",
  "metadata": {
    "timestamp": "2025-12-08T15:30:00.000Z",
    "operation": "get_farms_with_context"
  }
}
```

---

## Ejemplos de Uso desde el Frontend

### 1. Ejemplo Básico con Fetch API

```javascript
// Obtener todas las granjas (página 1, límite 25)
async function getAllFarms() {
  const token = localStorage.getItem('authToken');

  const response = await fetch('http://localhost:3000/api/farms?page=1&limit=25', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to fetch farms');
  }

  const result = await response.json();

  console.log('Farms:', result.data);
  console.log('Total farms:', result.pagination.total);
  console.log('Equipment count for first farm:', result.data[0]?.equipment_count);

  return result;
}
```

### 2. Ejemplo con Axios

```javascript
import axios from 'axios';

// Configurar axios con interceptor de autenticación
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Función para obtener granjas con filtros
async function getFarms({ page = 1, limit = 25, search = '', isActive = null, userId = null }) {
  try {
    const params = { page, limit };

    if (search) params.search = search;
    if (isActive !== null) params.is_active = isActive;
    if (userId) params.user_id = userId;

    const response = await api.get('/farms', { params });

    return {
      farms: response.data.data,
      pagination: response.data.pagination,
      metadata: response.data.metadata
    };
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data.error_message || 'Failed to fetch farms');
    }
    throw error;
  }
}

// Uso
const result = await getFarms({
  page: 1,
  limit: 25,
  search: 'norte',
  isActive: true
});
```

### 3. Ejemplo con React Hook

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Farm {
  id: string;
  created_at: string;
  name: string;
  acres: number;
  status: boolean;
  metadata: Record<string, any>;
  equipment_count: number;
  user_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface UseFarmsOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | null;
  userId?: string | null;
}

function useFarms(options: UseFarmsOptions = {}) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarms = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('authToken');
        const params: Record<string, any> = {
          page: options.page || 1,
          limit: options.limit || 25
        };

        if (options.search) params.search = options.search;
        if (options.isActive !== null && options.isActive !== undefined) {
          params.is_active = options.isActive;
        }
        if (options.userId) params.user_id = options.userId;

        const response = await axios.get('http://localhost:3000/api/farms', {
          params,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setFarms(response.data.data);
        setPagination(response.data.pagination);
      } catch (err: any) {
        setError(err.response?.data?.error_message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFarms();
  }, [options.page, options.limit, options.search, options.isActive, options.userId]);

  return { farms, pagination, loading, error };
}

// Uso del hook
function FarmsListComponent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { farms, pagination, loading, error } = useFarms({
    page,
    limit: 25,
    search,
    isActive: true
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar granja..."
      />

      <ul>
        {farms.map(farm => (
          <li key={farm.id}>
            {farm.name} - {farm.equipment_count} equipos, {farm.user_count} usuarios
          </li>
        ))}
      </ul>

      <div>
        <button
          disabled={!pagination?.has_prev}
          onClick={() => setPage(p => p - 1)}
        >
          Anterior
        </button>

        <span>Página {pagination?.page} de {pagination?.total_pages}</span>

        <button
          disabled={!pagination?.has_next}
          onClick={() => setPage(p => p + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
```

### 4. Ejemplo con Vue 3 Composition API

```typescript
import { ref, watch } from 'vue';
import axios from 'axios';

export function useFarms(options = {}) {
  const farms = ref([]);
  const pagination = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchFarms = async () => {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('authToken');
      const params = {
        page: options.page || 1,
        limit: options.limit || 25,
        ...(options.search && { search: options.search }),
        ...(options.isActive !== null && { is_active: options.isActive }),
        ...(options.userId && { user_id: options.userId })
      };

      const response = await axios.get('http://localhost:3000/api/farms', {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      farms.value = response.data.data;
      pagination.value = response.data.pagination;
    } catch (err) {
      error.value = err.response?.data?.error_message || err.message;
    } finally {
      loading.value = false;
    }
  };

  watch(() => [options.page, options.limit, options.search], fetchFarms, { immediate: true });

  return { farms, pagination, loading, error, refetch: fetchFarms };
}
```

---

## Casos de Uso Comunes

### 1. Listar todas las granjas (paginadas)
```
GET /api/farms?page=1&limit=25
```

### 2. Buscar granjas por nombre
```
GET /api/farms?page=1&limit=25&search=norte
```

### 3. Filtrar solo granjas activas
```
GET /api/farms?page=1&limit=25&is_active=true
```

### 4. Obtener granjas de un usuario específico
```
GET /api/farms?page=1&limit=25&user_id=550e8400-e29b-41d4-a716-446655440000
```

### 5. Búsqueda + Filtro activo + Usuario
```
GET /api/farms?page=1&limit=25&search=norte&is_active=true&user_id=550e8400-e29b-41d4-a716-446655440000
```

---

## Notas Importantes

1. **Autenticación**: Todos los requests requieren un token JWT válido en el header `Authorization`
2. **Límite máximo**: El parámetro `limit` tiene un máximo de 100 elementos
3. **Conteos incluidos**: La respuesta siempre incluye `equipment_count` y `user_count` para cada granja
4. **Búsqueda case-insensitive**: El parámetro `search` busca en el nombre de la granja sin distinguir mayúsculas/minúsculas
5. **Filtros opcionales**: Todos los query parameters son opcionales
6. **Paginación**: Usa `has_next` y `has_prev` para controlar la navegación de páginas en el frontend

---

## Diferencias con la Implementación Anterior

### Antes
- Se hacían queries separadas para obtener conteos de equipos y usuarios
- Más queries a la base de datos
- No había filtro por `is_active` o `user_id`

### Ahora
- Una sola llamada a función PostgreSQL
- Los conteos vienen incluidos en cada granja
- Soporta filtros adicionales (`is_active`, `user_id`)
- Mejor rendimiento y menos carga en la BD
