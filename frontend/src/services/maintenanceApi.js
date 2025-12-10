import api, { apiUtils } from './api'

export const maintenanceApi = {
  // Get all equipment with maintenance status
  async getEquipmentWithMaintenanceStatus(params = {}) {
    return apiUtils.getPaginated('/maintenance-system/equipment', params)
  },

  // Get maintenance templates for specific equipment
  async getMaintenanceTemplatesForEquipment(equipmentId) {
    const response = await api.get(`/maintenance-system/equipment/${equipmentId}/maintenance`)
    return response.data
  },

  // Create equipment with maintenance templates
  async createEquipmentWithMaintenance(data) {
    const response = await api.post('/maintenance-system/equipment-with-maintenance', data)
    return response.data
  },

  // Create individual maintenance template
  async createMaintenanceTemplate(data) {
    const response = await api.post('/maintenance-system/maintenance-template', data)
    return response.data
  },

  // Delete maintenance template
  async deleteMaintenanceTemplate(id) {
    const response = await api.delete(`/maintenance-system/maintenance-template/${id}`)
    return response.data
  },

  // Get equipment with maintenance templates (with filters)
  async getEquipmentWithMaintenanceTemplates(filters = {}) {
    return apiUtils.getPaginated('/maintenance-system/equipment-templates', filters)
  },

  // Get maintenance templates (new endpoint)
  async getMaintenanceTemplates(params = {}) {
    return apiUtils.getPaginated('/maintenance/templates', params)
  },

  // Get maintenance tasks for specific equipment
  async getMaintenanceTasksForEquipment(equipmentId) {
    const response = await api.get(`/maintenance-system/equipment-tasks/${equipmentId}`)
    return response.data
  },

  // Get maintenance tasks for equipment type
  async getMaintenanceTasksForEquipmentType(equipmentTypeId) {
    const response = await api.get(`/maintenance-system/equipment-type-tasks/${equipmentTypeId}`)
    return response.data
  },

  // Validate and update equipment for task series
  async validateAndUpdateEquipment(taskSeriesId, equipmentData) {
    const response = await api.put(`/maintenance-system/validate-equipment-update/${taskSeriesId}`, equipmentData)
    return response.data
  },

  // Get available time types for schedule selection
  async getTimeTypes() {
    const response = await api.get('/maintenance-system/time-types')
    return response.data
  },

  // Update maintenance task template
  async updateMaintenanceTask(taskId, scheduleId, updateData) {
    const response = await api.put(`/maintenance-system/task/${taskId}/schedule/${scheduleId}`, updateData)
    return response.data
  },

  // Bulk import maintenance templates
  async bulkImportTemplates(file) {
    const formData = new FormData()
    formData.append('csvFile', file)

    const response = await api.post('/import/maintenance-templates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }
}

export default maintenanceApi