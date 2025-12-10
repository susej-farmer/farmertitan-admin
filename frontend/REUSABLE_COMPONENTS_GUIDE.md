# Guía de Componentes Reutilizables - FarmerTitan Admin

**Fecha de creación**: 2025-12-08
**Propósito**: Evitar duplicación de código y mantener consistencia en el proyecto

---

## 🎯 Principios Clave

1. **NO duplicar código** - Si existe un componente reutilizable, úsalo
2. **Mantener consistencia** - Misma UX en funcionalidades similares
3. **Componentes genéricos** - Diseñar pensando en reutilización
4. **Composables compartidos** - Lógica común en composables

---

## 📦 Componentes Reutilizables Creados

### 1. Bulk Import Components (`/src/components/shared/bulk-import/`)

#### **BulkImportUploadZone.vue**
**Uso**: Zona drag & drop para subir archivos CSV

```vue
<BulkImportUploadZone
  accept=".csv"
  :max-size="5242880"
  accept-label="CSV files only, up to 5MB"
  @file-selected="handleFileSelected"
  @file-cleared="handleFileCleared"
/>
```

**Props**:
- `accept` (string): Tipo de archivo aceptado (default: '.csv')
- `maxSize` (number): Tamaño máximo en bytes (default: 5MB)
- `acceptLabel` (string): Texto descriptivo

**Events**:
- `file-selected(file)`: Cuando se selecciona un archivo
- `file-cleared()`: Cuando se elimina el archivo
- `validation-error(message)`: Cuando hay error de validación

---

#### **BulkImportPreview.vue**
**Uso**: Vista previa de las primeras filas del CSV

```vue
<BulkImportPreview
  :headers="['name', 'type', 'value']"
  :data="previewData"
  :total-rows="100"
  :processing="false"
  entity-name="Templates"
  import-button-text="Import"
  @import="processImport"
/>
```

**Props**:
- `headers` (array): Columnas del CSV
- `data` (array): Primeras 5 filas
- `totalRows` (number): Total de filas en el CSV
- `processing` (boolean): Estado de carga
- `entityName` (string): Nombre de entidad (default: 'Records')
- `importButtonText` (string): Texto del botón

**Events**:
- `import()`: Cuando se hace clic en importar

---

#### **BulkImportResults.vue**
**Uso**: Resultados del import con tabs de éxito/errores

```vue
<BulkImportResults
  :result="importResult"
  @reset="resetImport"
  @download-success="downloadSuccessReport"
  @download-errors="downloadErrorReport"
>
  <!-- Custom Success Table -->
  <template #success-table="{ items }">
    <table>...</table>
  </template>

  <!-- Custom Failed Table -->
  <template #failed-table="{ items }">
    <table>...</table>
  </template>

  <!-- Extra Actions -->
  <template #extra-actions="{ result }">
    <button>View All</button>
  </template>
</BulkImportResults>
```

**Props**:
- `result` (object): Objeto de resultado con estructura:
  ```javascript
  {
    success: true,
    message: "Import completed",
    summary: {
      totalRecords: 100,
      successfullyCreated: 95,
      skipped: 5
    },
    processed: [...],
    skipped: [...]
  }
  ```

**Events**:
- `reset()`: Reiniciar import
- `download-success(items)`: Descargar reporte de éxitos
- `download-errors(items)`: Descargar reporte de errores

**Slots**:
- `success-table`: Tabla personalizada de éxitos
- `failed-table`: Tabla personalizada de errores
- `extra-actions`: Acciones adicionales

---

#### **BulkImportTemplateDownload.vue**
**Uso**: Banner para descargar template CSV

```vue
<BulkImportTemplateDownload
  template-path="/templates/my_template.csv"
  file-name="my_template.csv"
  message="Need a template?"
  button-text="Download Template"
/>
```

---

### 2. Composable: useBulkImport (`/src/composables/useBulkImport.js`)

**Uso**: Lógica reutilizable para parsear CSV y manejar imports

```javascript
import { useBulkImport } from '@/composables/useBulkImport'

const {
  previewData,
  previewHeaders,
  totalRows,
  validationError,
  parseAndPreview,
  generateCSV,
  downloadCSV,
  reset
} = useBulkImport({
  maxRows: 500,
  requiredColumns: ['name', 'type']
})

// Parsear CSV
await parseAndPreview(file)

// Generar CSV para descarga
const csvContent = generateCSV(headers, rows)
downloadCSV(csvContent, 'report.csv')
```

**Opciones**:
- `maxRows` (number): Máximo de filas permitidas (default: 500)
- `requiredColumns` (array): Columnas obligatorias

**Retorna**:
- `previewData` (ref): Primeras 5 filas parseadas
- `previewHeaders` (ref): Headers del CSV
- `totalRows` (ref): Total de filas
- `validationError` (ref): Error de validación
- `parseAndPreview(file)`: Parsear archivo
- `generateCSV(headers, rows)`: Generar contenido CSV
- `downloadCSV(content, filename)`: Descargar CSV
- `reset()`: Limpiar estado

---

### 3. Metadata Editor Components (`/src/components/farms/`)

#### **CropsSelector.vue**
**Uso**: Selector multi-crop con categorías

```vue
<CropsSelector v-model="crops" />
```

**Modelo de datos**:
```javascript
[
  {
    label: "Corn",
    value: "row:corn",
    category: "row"
  },
  {
    label: "Wine Grapes",
    value: "specialty:wine-grapes",
    category: "specialty"
  }
]
```

**Categorías disponibles**:
- `row`: Row Crops (azul)
- `specialty`: Specialty (morado)
- `tree`: Tree Crops (verde)
- `vegetable`: Vegetables (naranja)
- `other`: Other (gris)

---

#### **MetadataEditor.vue**
**Uso**: Editor de metadata con toggle y campos key-value

```vue
<MetadataEditor v-model="metadata" />
```

**Modelo de datos**:
```javascript
{
  pivot_irrigation: true,
  custom_field_1: "value",
  custom_field_2: 123,
  custom_field_3: true
}
```

**Características**:
- Toggle visual para `pivot_irrigation`
- Editor key-value para campos adicionales
- Soporte para tipos: text, number, boolean
- Exclusión automática de campos conocidos (crops, created_by)

---

## 🔌 Endpoints Backend Configurados

### Bulk Import Maintenance Templates
```
POST /api/import/maintenance-templates
Content-Type: multipart/form-data
Field: csvFile
```

**Implementación en frontend**:
```javascript
// src/services/maintenanceApi.js
async bulkImportTemplates(file) {
  const formData = new FormData()
  formData.append('csvFile', file)

  const response = await api.post('/import/maintenance-templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
```

---

## 📋 Ejemplos de Implementación

### Ejemplo 1: Bulk Import en Maintenance Templates

**Archivo**: `src/components/maintenance/BulkImportModal.vue`

```vue
<template>
  <div class="modal">
    <!-- Download Template -->
    <BulkImportTemplateDownload
      template-path="/templates/maintenance_template.csv"
      file-name="maintenance_template.csv"
    />

    <!-- Upload Zone -->
    <BulkImportUploadZone
      @file-selected="handleFileSelected"
    />

    <!-- Preview -->
    <BulkImportPreview
      :headers="previewHeaders"
      :data="previewData"
      :total-rows="totalRows"
      @import="processImport"
    />

    <!-- Results -->
    <BulkImportResults
      :result="importResult"
      @reset="resetImport"
    >
      <template #success-table="{ items }">
        <!-- Custom table -->
      </template>
    </BulkImportResults>
  </div>
</template>

<script setup>
import { useBulkImport } from '@/composables/useBulkImport'
import { maintenanceApi } from '@/services/maintenanceApi'

const {
  previewData,
  previewHeaders,
  totalRows,
  parseAndPreview
} = useBulkImport({
  maxRows: 500,
  requiredColumns: ['_equipment_type', 'task_name']
})

const handleFileSelected = async (file) => {
  await parseAndPreview(file)
}

const processImport = async () => {
  const response = await maintenanceApi.bulkImportTemplates(selectedFile.value)
  importResult.value = response
}
</script>
```

---

### Ejemplo 2: Metadata Editor en Farm Modal

**Archivo**: `src/views/farms/FarmsOverview.vue`

```vue
<template>
  <form @submit.prevent="saveFarm">
    <!-- Basic Fields -->
    <input v-model="form.name" />
    <input v-model="form.acres" />

    <!-- Farm Details Section -->
    <div class="border-t pt-4">
      <h4>Farm Details</h4>

      <!-- Crops -->
      <CropsSelector v-model="form.crops" />

      <!-- Metadata -->
      <MetadataEditor v-model="form.metadata" />
    </div>
  </form>
</template>

<script setup>
import CropsSelector from '@/components/farms/CropsSelector.vue'
import MetadataEditor from '@/components/farms/MetadataEditor.vue'

const form = reactive({
  name: '',
  acres: null,
  crops: [],
  metadata: {}
})

const saveFarm = async () => {
  const data = {
    name: form.name,
    acres: form.acres,
    metadata: {
      ...form.metadata,
      crops: form.crops
    }
  }

  await farmsApi.updateFarm(form.id, data)
}
</script>
```

---

## ✅ Checklist para Nuevas Funcionalidades

Antes de crear un componente nuevo, pregúntate:

- [ ] ¿Ya existe un componente similar que pueda reutilizar?
- [ ] ¿Este componente puede ser genérico para usar en otros lugares?
- [ ] ¿La lógica puede extraerse a un composable?
- [ ] ¿Sigo el mismo patrón de UX que otros componentes similares?

### Para Bulk Imports:
- [ ] Usar componentes de `/src/components/shared/bulk-import/`
- [ ] Usar composable `useBulkImport`
- [ ] Seguir estructura de respuesta estándar del backend
- [ ] Slots personalizados para tablas específicas

### Para Metadata/JSON:
- [ ] Usar `CropsSelector` para crops
- [ ] Usar `MetadataEditor` para campos adicionales
- [ ] NO mostrar JSON raw al usuario
- [ ] Campos específicos para metadata conocida + key-value para desconocida

---

## 🎨 Patrones de UI Consistentes

### Colores de Categorías
```javascript
const categoryColors = {
  row: 'bg-blue-100 text-blue-800',
  specialty: 'bg-purple-100 text-purple-800',
  tree: 'bg-green-100 text-green-800',
  vegetable: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800'
}
```

### Badges de Estado
```javascript
const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800'
}
```

### Task Count Badges (Maintenance)
```javascript
const getTaskCountColor = (count) => {
  if (count === 0) return 'bg-red-100 text-red-800'
  if (count <= 5) return 'bg-yellow-100 text-yellow-800'
  if (count <= 10) return 'bg-blue-100 text-blue-800'
  return 'bg-emerald-100 text-emerald-800'
}
```

---

## 🚨 Errores Comunes a Evitar

1. **NO duplicar lógica de parseo CSV** → Usar `useBulkImport`
2. **NO crear componentes de upload duplicados** → Usar `BulkImportUploadZone`
3. **NO pedir JSON raw al usuario** → Usar editores visuales
4. **NO hardcodear tablas de resultados** → Usar slots en `BulkImportResults`
5. **NO repetir validaciones de CSV** → El composable ya las tiene

---

## 📚 Archivos de Referencia

**Componentes compartidos**:
- `/src/components/shared/bulk-import/BulkImportUploadZone.vue`
- `/src/components/shared/bulk-import/BulkImportPreview.vue`
- `/src/components/shared/bulk-import/BulkImportResults.vue`
- `/src/components/shared/bulk-import/BulkImportTemplateDownload.vue`

**Composables**:
- `/src/composables/useBulkImport.js`

**Implementaciones de ejemplo**:
- `/src/components/maintenance/BulkImportModal.vue` - Bulk import completo
- `/src/components/farms/CropsSelector.vue` - Multi-select con categorías
- `/src/components/farms/MetadataEditor.vue` - Editor key-value + toggles
- `/src/views/farms/FarmsOverview.vue` - Uso de metadata editors

**Templates CSV**:
- `/public/templates/maintenance_template.csv`
- `/public/templates/equipment_template.csv`

---

### 4. Task Status Components (`/src/components/shared/`)

#### **TaskBadges.vue**
**Uso**: Badges compactos con tooltip y panel expandible para mostrar tareas abiertas/cerradas por tipo

```vue
<TaskBadges
  :open-tasks="farm.open_tasks"
  :closed-tasks="farm.close_tasks"
/>
```

**Props**:
- `openTasks` (array): Array de tareas abiertas
- `closedTasks` (array): Array de tareas cerradas

**Estructura de datos esperada**:
```javascript
openTasks: [
  { type: "maintenance", quantity: 5 },
  { type: "repair", quantity: 3 },
  { type: "todo", quantity: 0 }
]

closedTasks: [
  { type: "maintenance", quantity: 12 },
  { type: "repair", quantity: 7 },
  { type: "todo", quantity: 2 }
]
```

**Características**:
- **Badges compactos**: Muestra total de tareas abiertas/cerradas (ej: `🟢 8 | 🔴 12`)
- **Tooltip on hover**: Vista rápida del desglose por tipo al pasar el mouse
- **Escalable**: Soporta múltiples tipos de tareas sin saturar la UI
- **Colores semánticos**: Verde para abiertas, gris para cerradas
- **Diseño limpio**: Sin botones adicionales, información solo al hacer hover

**Casos de uso**:
- Listado de farms mostrando tareas por granja
- Dashboard de equipos con tareas pendientes
- Resumen de mantenimiento por location
- Cualquier vista que necesite mostrar tareas agrupadas por tipo

**Ejemplo de implementación**:
```vue
<!-- En una tabla de farms -->
<td class="table-cell">
  <TaskBadges
    :open-tasks="farm.open_tasks || []"
    :closed-tasks="farm.close_tasks || []"
  />
</td>
```

**Estilos y UX**:
- Tooltips con fondo oscuro (gray-900) para buena legibilidad
- Animaciones suaves de expand/collapse
- Transiciones de fade para tooltips
- Responsive: funciona en mobile y desktop
- Accesible: títulos descriptivos en botones

---

## 🔄 Próximas Mejoras Sugeridas

1. **BulkImportModal genérico** - Modal base reutilizable para cualquier bulk import
2. **FormField components** - Input, Select, Toggle reutilizables con validación
3. **useMetadata composable** - Lógica compartida para manejar metadata
4. **DataTable component** - Tabla genérica con sorting, filtering, pagination

---

**Última actualización**: 2025-12-10
**Mantenido por**: Claude Code Agent
