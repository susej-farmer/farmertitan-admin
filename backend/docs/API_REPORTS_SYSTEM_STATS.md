# GET /api/reports/system-stats - Documentación Completa

## Descripción
Endpoint para obtener estadísticas generales del sistema, incluyendo información sobre equipos, granjas y códigos QR. Utiliza la función PostgreSQL `get_system_stats()`.

---

## Endpoint
```
GET http://localhost:3000/api/reports/system-stats
```

---

## Headers Requeridos
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Query Parameters
Este endpoint **NO acepta query parameters**. Retorna todas las estadísticas del sistema.

---

## Respuestas Posibles

### ✅ 200 OK - Éxito

#### Estructura de Respuesta
```json
{
  "success": true,
  "data": {
    "equipment": {
      "active_count": 145,
      "total_count": 178,
      "inactive_count": 33
    },
    "farms": {
      "active_count": 42,
      "total_count": 50,
      "inactive_count": 8,
      "total_acres": 15234.5,
      "active_acres": 12890.25
    },
    "qr": {
      "bound_count": 1250,
      "total_count": 2500,
      "unbound_count": 1250,
      "status_breakdown": {
        "generated": 800,
        "allocated": 200,
        "delivered": 150,
        "bound": 1250,
        "lost": 50,
        "damaged": 30,
        "retired": 20
      }
    }
  },
  "metadata": {
    "timestamp": "2025-12-08T15:30:00.000Z",
    "operation": "get_system_stats"
  }
}
```

#### Campos de Respuesta

**`data.equipment` (object)**: Estadísticas de equipos
- `active_count` (integer): Cantidad de equipos activos
- `total_count` (integer): Total de equipos en el sistema
- `inactive_count` (integer): Cantidad de equipos inactivos

**`data.farms` (object)**: Estadísticas de granjas
- `active_count` (integer): Cantidad de granjas activas
- `total_count` (integer): Total de granjas en el sistema
- `inactive_count` (integer): Cantidad de granjas inactivas
- `total_acres` (decimal): Total de acres de todas las granjas
- `active_acres` (decimal): Total de acres de granjas activas

**`data.qr` (object)**: Estadísticas de códigos QR
- `bound_count` (integer): Cantidad de QR codes vinculados a equipos
- `total_count` (integer): Total de QR codes en el sistema
- `unbound_count` (integer): Cantidad de QR codes sin vincular
- `status_breakdown` (object): Desglose por estado
  - `generated` (integer): QR codes generados
  - `allocated` (integer): QR codes asignados
  - `delivered` (integer): QR codes entregados
  - `bound` (integer): QR codes vinculados
  - `lost` (integer): QR codes perdidos
  - `damaged` (integer): QR codes dañados
  - `retired` (integer): QR codes retirados

**`metadata` (object)**: Metadatos de la operación
- `timestamp` (timestamp): Momento de ejecución
- `operation` (string): Nombre de la función ejecutada

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
  "metadata": {
    "timestamp": "2025-12-08T15:30:00.000Z",
    "operation": "get_system_stats"
  }
}
```

---

## Ejemplos de Uso desde el Frontend

### 1. Ejemplo Básico con Fetch API

```javascript
// Obtener estadísticas del sistema
async function getSystemStats() {
  const token = localStorage.getItem('authToken');

  const response = await fetch('http://localhost:3000/api/reports/system-stats', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to fetch system stats');
  }

  const result = await response.json();

  console.log('Equipment Stats:', result.data.equipment);
  console.log('Farms Stats:', result.data.farms);
  console.log('QR Stats:', result.data.qr);

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

// Función para obtener estadísticas del sistema
async function getSystemStats() {
  try {
    const response = await api.get('/reports/system-stats');

    return {
      equipment: response.data.data.equipment,
      farms: response.data.data.farms,
      qr: response.data.data.qr,
      metadata: response.data.metadata
    };
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data.error_message || 'Failed to fetch system stats');
    }
    throw error;
  }
}

// Uso
const stats = await getSystemStats();
console.log('Active Equipment:', stats.equipment.active_count);
console.log('Total Farms:', stats.farms.total_count);
console.log('Bound QR Codes:', stats.qr.bound_count);
```

### 3. Ejemplo con React Hook

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface EquipmentStats {
  active_count: number;
  total_count: number;
  inactive_count: number;
}

interface FarmStats {
  active_count: number;
  total_count: number;
  inactive_count: number;
  total_acres: number;
  active_acres: number;
}

interface QRStats {
  bound_count: number;
  total_count: number;
  unbound_count: number;
  status_breakdown: {
    generated: number;
    allocated: number;
    delivered: number;
    bound: number;
    lost: number;
    damaged: number;
    retired: number;
  };
}

interface SystemStats {
  equipment: EquipmentStats;
  farms: FarmStats;
  qr: QRStats;
}

function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get('http://localhost:3000/api/reports/system-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setStats(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error_message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

// Uso del hook
function DashboardComponent() {
  const { stats, loading, error } = useSystemStats();

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="dashboard">
      <h1>System Statistics</h1>

      <section className="equipment-stats">
        <h2>Equipment</h2>
        <p>Active: {stats.equipment.active_count}</p>
        <p>Total: {stats.equipment.total_count}</p>
        <p>Inactive: {stats.equipment.inactive_count}</p>
      </section>

      <section className="farm-stats">
        <h2>Farms</h2>
        <p>Active: {stats.farms.active_count}</p>
        <p>Total: {stats.farms.total_count}</p>
        <p>Total Acres: {stats.farms.total_acres.toFixed(2)}</p>
        <p>Active Acres: {stats.farms.active_acres.toFixed(2)}</p>
      </section>

      <section className="qr-stats">
        <h2>QR Codes</h2>
        <p>Bound: {stats.qr.bound_count}</p>
        <p>Unbound: {stats.qr.unbound_count}</p>
        <p>Total: {stats.qr.total_count}</p>

        <h3>Status Breakdown</h3>
        <ul>
          <li>Generated: {stats.qr.status_breakdown.generated}</li>
          <li>Allocated: {stats.qr.status_breakdown.allocated}</li>
          <li>Delivered: {stats.qr.status_breakdown.delivered}</li>
          <li>Bound: {stats.qr.status_breakdown.bound}</li>
          <li>Lost: {stats.qr.status_breakdown.lost}</li>
          <li>Damaged: {stats.qr.status_breakdown.damaged}</li>
          <li>Retired: {stats.qr.status_breakdown.retired}</li>
        </ul>
      </section>
    </div>
  );
}
```

### 4. Ejemplo con Vue 3 Composition API

```typescript
import { ref, onMounted } from 'vue';
import axios from 'axios';

export function useSystemStats() {
  const stats = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchStats = async () => {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:3000/api/reports/system-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      stats.value = response.data.data;
    } catch (err) {
      error.value = err.response?.data?.error_message || err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchStats);

  return { stats, loading, error, refetch: fetchStats };
}

// Uso en componente
export default {
  setup() {
    const { stats, loading, error, refetch } = useSystemStats();

    return { stats, loading, error, refetch };
  }
}
```

### 5. Ejemplo para Dashboard con Chart.js

```javascript
import axios from 'axios';
import Chart from 'chart.js/auto';

async function createDashboardCharts() {
  const token = localStorage.getItem('authToken');

  const response = await axios.get('http://localhost:3000/api/reports/system-stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const { equipment, farms, qr } = response.data.data;

  // Equipment Chart
  new Chart(document.getElementById('equipmentChart'), {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Inactive'],
      datasets: [{
        data: [equipment.active_count, equipment.inactive_count],
        backgroundColor: ['#10b981', '#ef4444']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `Equipment (${equipment.total_count} total)`
        }
      }
    }
  });

  // Farms Chart
  new Chart(document.getElementById('farmsChart'), {
    type: 'bar',
    data: {
      labels: ['Active', 'Inactive'],
      datasets: [{
        label: 'Farms',
        data: [farms.active_count, farms.inactive_count],
        backgroundColor: ['#3b82f6', '#94a3b8']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `Farms (${farms.total_count} total, ${farms.total_acres.toFixed(0)} acres)`
        }
      }
    }
  });

  // QR Status Breakdown Chart
  new Chart(document.getElementById('qrChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(qr.status_breakdown),
      datasets: [{
        data: Object.values(qr.status_breakdown),
        backgroundColor: [
          '#8b5cf6', '#ec4899', '#f59e0b',
          '#10b981', '#ef4444', '#f97316', '#6366f1'
        ]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `QR Codes Status (${qr.total_count} total)`
        }
      }
    }
  });
}

// Llamar al cargar la página
document.addEventListener('DOMContentLoaded', createDashboardCharts);
```

---

## Casos de Uso Comunes

### 1. Dashboard principal
```
GET /api/reports/system-stats
```
Mostrar resumen general del sistema en la página principal del admin.

### 2. Monitoreo en tiempo real
```javascript
// Actualizar cada 30 segundos
setInterval(async () => {
  const stats = await getSystemStats();
  updateDashboard(stats);
}, 30000);
```

### 3. Reportes ejecutivos
Usar los datos para generar reportes PDF o Excel con estadísticas del sistema.

### 4. Alertas automáticas
```javascript
const stats = await getSystemStats();
if (stats.data.equipment.inactive_count > 50) {
  alert('Warning: More than 50 inactive equipment items!');
}
```

---

## Notas Importantes

1. **Autenticación**: Este endpoint requiere un token JWT válido
2. **Sin parámetros**: No acepta query parameters, retorna todas las estadísticas
3. **Caché recomendado**: Considera cachear la respuesta en el frontend por 5-10 minutos
4. **Datos en tiempo real**: Los datos son calculados en tiempo real desde la base de datos
5. **Rendimiento**: La función PostgreSQL está optimizada para ejecución rápida

---

## Arquitectura del Endpoint

```
Request → Route (reports.js) → Service (systemStatsService.js) → Client (systemStatsClient.js) → PostgreSQL (get_system_stats()) → Response
```

**Capas del sistema:**
1. **Route**: Maneja la request HTTP y autenticación
2. **Service**: Lógica de negocio (actualmente pass-through)
3. **Client**: Comunicación directa con la base de datos
4. **PostgreSQL**: Función que ejecuta las consultas y retorna estadísticas

---

## Diferencias con Otros Endpoints

- **No paginación**: Retorna todos los datos de una vez (no hay paginación)
- **Solo lectura**: No modifica datos, solo consulta
- **Respuesta completa**: Incluye metadata con timestamp de ejecución
- **Estructura fija**: Siempre retorna la misma estructura de datos
