# GET /api/maintenance-system/equipment/:id - Documentación Completa

## Descripción
Endpoint para obtener información detallada de un equipo específico por su ID. Retorna datos completos del equipo incluyendo información del catálogo (tipo, marca, modelo, trim), granja asociada y metadatos.

---

## Endpoint
```
GET http://localhost:3000/api/maintenance-system/equipment/:id
```

---

## Headers Requeridos
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Path Parameters

| Parámetro | Tipo   | Requerido | Descripción                    |
|-----------|--------|-----------|--------------------------------|
| `id`      | UUID   | ✅ Sí     | ID único del equipo            |

---

## Respuestas Posibles

### ✅ 200 OK - Éxito

#### Estructura de Respuesta
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tractor John Deere 2024",
    "serial_number": "JD2024-12345",
    "status": "active",
    "farm": "14d085fb-0b58-4f75-ac88-effc8d2f150c",
    "initial_usage_value": 1250.5,
    "initial_usage_type": "Hours",
    "year_purchased": 2024,
    "lease_owned": "owned",
    "warranty_time": "2 years",
    "warranty_details": "Full coverage manufacturer warranty",
    "metadata": {
      "last_service": "2025-11-15",
      "notes": "Recently serviced"
    },
    "created_at": "2025-01-15T10:30:00.000Z",
    "_equipment": {
      "id": "abc123-def456-ghi789",
      "type": "type-uuid-1",
      "make": "make-uuid-2",
      "model": "model-uuid-3",
      "trim": "trim-uuid-4",
      "year": 2024,
      "_equipment_type": {
        "name": "Tractor"
      },
      "_equipment_make": {
        "name": "John Deere"
      },
      "_equipment_model": {
        "name": "5075E"
      },
      "_equipment_trim": {
        "name": "Premium"
      }
    },
    "farm": {
      "name": "Granja Norte"
    }
  }
}
```

#### Campos de Respuesta

**Campos Principales del Equipo:**
- `id` (UUID): Identificador único del equipo
- `name` (string): Nombre descriptivo del equipo
- `serial_number` (string | null): Número de serie del fabricante
- `status` (string): Estado del equipo (`active` | `inactive`)
- `farm` (UUID): ID de la granja a la que pertenece
- `initial_usage_value` (decimal): Valor inicial de uso (horas/kilómetros/millas)
- `initial_usage_type` (string): Tipo de medición (`Hours` | `Kilometers` | `Miles`)
- `year_purchased` (integer | null): Año de compra
- `lease_owned` (string | null): Tipo de adquisición (`owned` | `leased`)
- `warranty_time` (string | null): Duración de la garantía
- `warranty_details` (string | null): Detalles de la garantía
- `metadata` (jsonb): Metadatos adicionales del equipo
- `created_at` (timestamp): Fecha de creación del registro

**Información del Catálogo (_equipment):**
- `_equipment.id` (UUID): ID del registro en el catálogo
- `_equipment.type` (UUID): ID del tipo de equipo
- `_equipment.make` (UUID): ID de la marca
- `_equipment.model` (UUID): ID del modelo
- `_equipment.trim` (UUID | null): ID del trim/versión
- `_equipment.year` (integer): Año del modelo
- `_equipment._equipment_type.name` (string): Nombre del tipo (ej: "Tractor", "Harvester")
- `_equipment._equipment_make.name` (string): Nombre de la marca (ej: "John Deere", "Case IH")
- `_equipment._equipment_model.name` (string): Nombre del modelo (ej: "5075E", "8R 370")
- `_equipment._equipment_trim.name` (string | null): Nombre del trim (ej: "Premium", "Deluxe")

**Información de la Granja (farm):**
- `farm.name` (string): Nombre de la granja

---

### ❌ 400 Bad Request - ID Inválido
```json
{
  "success": false,
  "error": "MISSING_ID",
  "message": "Equipment ID is required"
}
```

---

### ❌ 404 Not Found - Equipo No Existe
```json
{
  "success": false,
  "error": "EQUIPMENT_NOT_FOUND",
  "message": "Equipment not found"
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

## Ejemplos de Uso desde el Frontend

### 1. Ejemplo Básico con Fetch API

```javascript
// Obtener información de un equipo específico
async function getEquipmentById(equipmentId) {
  const token = localStorage.getItem('authToken');

  const response = await fetch(`http://localhost:3000/api/maintenance-system/equipment/${equipmentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch equipment');
  }

  const result = await response.json();

  console.log('Equipment:', result.data);
  console.log('Type:', result.data._equipment._equipment_type.name);
  console.log('Make:', result.data._equipment._equipment_make.name);
  console.log('Model:', result.data._equipment._equipment_model.name);

  return result.data;
}

// Uso
const equipment = await getEquipmentById('550e8400-e29b-41d4-a716-446655440000');
```

### 2. Ejemplo con Axios

```javascript
import axios from 'axios';

// Configurar axios
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Función para obtener equipo
async function getEquipment(equipmentId) {
  try {
    const response = await api.get(`/maintenance-system/equipment/${equipmentId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch equipment');
  }
}

// Uso
const equipment = await getEquipment('550e8400-e29b-41d4-a716-446655440000');
console.log(`${equipment._equipment._equipment_make.name} ${equipment._equipment._equipment_model.name}`);
```

### 3. Ejemplo con React Hook

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Equipment {
  id: string;
  name: string;
  serial_number: string | null;
  status: 'active' | 'inactive';
  farm: string;
  initial_usage_value: number;
  initial_usage_type: 'Hours' | 'Kilometers' | 'Miles';
  year_purchased: number | null;
  lease_owned: 'owned' | 'leased' | null;
  warranty_time: string | null;
  warranty_details: string | null;
  metadata: Record<string, any>;
  created_at: string;
  _equipment: {
    id: string;
    type: string;
    make: string;
    model: string;
    trim: string | null;
    year: number;
    _equipment_type: { name: string };
    _equipment_make: { name: string };
    _equipment_model: { name: string };
    _equipment_trim: { name: string } | null;
  };
  farm: { name: string };
}

function useEquipment(equipmentId: string) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!equipmentId) return;

    const fetchEquipment = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(
          `http://localhost:3000/api/maintenance-system/equipment/${equipmentId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        setEquipment(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [equipmentId]);

  return { equipment, loading, error };
}

// Uso del hook
function EquipmentDetailComponent({ equipmentId }: { equipmentId: string }) {
  const { equipment, loading, error } = useEquipment(equipmentId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!equipment) return null;

  return (
    <div className="equipment-detail">
      <h1>{equipment.name}</h1>

      <section className="equipment-info">
        <h2>Basic Information</h2>
        <p>Type: {equipment._equipment._equipment_type.name}</p>
        <p>Make: {equipment._equipment._equipment_make.name}</p>
        <p>Model: {equipment._equipment._equipment_model.name}</p>
        {equipment._equipment._equipment_trim && (
          <p>Trim: {equipment._equipment._equipment_trim.name}</p>
        )}
        <p>Year: {equipment._equipment.year}</p>
        <p>Status: {equipment.status}</p>
      </section>

      <section className="ownership-info">
        <h2>Ownership & Warranty</h2>
        <p>Serial Number: {equipment.serial_number || 'N/A'}</p>
        <p>Year Purchased: {equipment.year_purchased || 'N/A'}</p>
        <p>Lease/Owned: {equipment.lease_owned || 'N/A'}</p>
        <p>Warranty: {equipment.warranty_time || 'N/A'}</p>
        {equipment.warranty_details && (
          <p>Details: {equipment.warranty_details}</p>
        )}
      </section>

      <section className="usage-info">
        <h2>Usage Information</h2>
        <p>Initial Usage: {equipment.initial_usage_value} {equipment.initial_usage_type}</p>
      </section>

      <section className="farm-info">
        <h2>Farm</h2>
        <p>{equipment.farm.name}</p>
      </section>
    </div>
  );
}
```

### 4. Ejemplo con Vue 3 Composition API

```typescript
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

export function useEquipment(equipmentId: Ref<string>) {
  const equipment = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchEquipment = async () => {
    if (!equipmentId.value) return;

    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:3000/api/maintenance-system/equipment/${equipmentId.value}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      equipment.value = response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  };

  watch(equipmentId, fetchEquipment, { immediate: true });

  return { equipment, loading, error, refetch: fetchEquipment };
}
```

---

## Resumen de Información Disponible

### 📊 Datos Básicos del Equipo
- ✅ ID único
- ✅ Nombre descriptivo
- ✅ Número de serie
- ✅ Estado (activo/inactivo)
- ✅ Fecha de creación

### 🏭 Información del Catálogo
- ✅ Tipo de equipo (Tractor, Harvester, etc.)
- ✅ Marca (John Deere, Case IH, etc.)
- ✅ Modelo (5075E, 8R 370, etc.)
- ✅ Trim/Versión (Premium, Deluxe, etc.) - Opcional
- ✅ Año del modelo

### 📍 Ubicación y Propiedad
- ✅ Granja asociada (ID y nombre)
- ✅ Tipo de adquisición (propio/arrendado)
- ✅ Año de compra

### 📝 Información de Uso
- ✅ Valor inicial de uso (horas/km/millas)
- ✅ Tipo de medición

### 🛡️ Garantía
- ✅ Duración de la garantía
- ✅ Detalles de la garantía

### 🔧 Metadatos Personalizados
- ✅ Campo JSONB flexible para información adicional
- ✅ Notas, fechas de servicio, etc.

---

## Otros Endpoints Relacionados

### Obtener Mantenimiento del Equipo
```
GET /api/maintenance-system/equipment/:id/maintenance
```
Retorna los templates de mantenimiento asociados al equipo.

### Listar Todos los Equipos
```
GET /api/maintenance-system/equipment?page=1&limit=20
```
Retorna lista paginada de equipos con estado de mantenimiento.

### Obtener Equipos de una Granja
```
GET /api/farms/:id/equipment?page=1&limit=20
```
Retorna equipos de una granja específica.

---

## Casos de Uso Comunes

### 1. Página de Detalle de Equipo
```javascript
// Mostrar toda la información del equipo en una página dedicada
const equipment = await getEquipment(equipmentId);
```

### 2. Formulario de Edición
```javascript
// Cargar datos actuales del equipo para editar
const equipment = await getEquipment(equipmentId);
populateEditForm(equipment);
```

### 3. Vista Rápida (Modal/Drawer)
```javascript
// Mostrar información rápida en un modal
const equipment = await getEquipment(equipmentId);
showQuickViewModal(equipment);
```

### 4. Validación antes de Operación
```javascript
// Verificar que el equipo existe antes de programar mantenimiento
const equipment = await getEquipment(equipmentId);
if (equipment.status === 'active') {
  scheduleMaintenance(equipment);
}
```

---

## Notas Importantes

1. **Autenticación requerida**: Este endpoint requiere token JWT válido
2. **Validación de UUID**: El ID debe ser un UUID válido (formato v4)
3. **Relaciones anidadas**: La respuesta incluye datos relacionados (tipo, marca, modelo, granja)
4. **Campos opcionales**: Algunos campos pueden ser `null` (serial_number, trim, warranty, etc.)
5. **Uso de joins**: El endpoint usa INNER joins para garantizar integridad de datos

---

## Arquitectura del Endpoint

```
Request → Route (maintenanceSystem.js) → Service (equipmentManagementService.js) → Client (equipmentClient.js) → Supabase (equipment table with joins) → Response
```

**Tablas consultadas:**
- `equipment` - Tabla principal
- `_equipment` - Catálogo de equipos
- `_equipment_type` - Tipos de equipo
- `_equipment_make` - Marcas
- `_equipment_model` - Modelos
- `_equipment_trim` - Trims/Versiones
- `farm` - Granjas
