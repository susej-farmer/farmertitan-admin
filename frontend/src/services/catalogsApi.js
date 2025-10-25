import api, { apiUtils } from './api'

export const catalogsApi = {
  // Equipment Types
  async getEquipmentTypes(params = {}) {
    return apiUtils.getPaginated('/catalogs/equipment-types', params)
  },

  async getEquipmentType(id) {
    const response = await api.get(`/catalogs/equipment-types/${id}`)
    return response.data
  },

  async createEquipmentType(data) {
    const response = await api.post('/catalogs/equipment-types', data)
    return response.data
  },

  async updateEquipmentType(id, data) {
    const response = await api.put(`/catalogs/equipment-types/${id}`, data)
    return response.data
  },

  async deleteEquipmentType(id) {
    const response = await api.delete(`/catalogs/equipment-types/${id}`)
    return response.data
  },

  async getEquipmentTypesDropdown() {
    const response = await api.get('/catalogs/equipment-types/dropdown')
    return response.data
  },

  // Equipment Makes
  async getEquipmentMakes(params = {}) {
    return apiUtils.getPaginated('/catalogs/equipment-makes', params)
  },

  async getEquipmentMake(id) {
    const response = await api.get(`/catalogs/equipment-makes/${id}`)
    return response.data
  },

  async createEquipmentMake(data) {
    const response = await api.post('/catalogs/equipment-makes', data)
    return response.data
  },

  async updateEquipmentMake(id, data) {
    const response = await api.put(`/catalogs/equipment-makes/${id}`, data)
    return response.data
  },

  async deleteEquipmentMake(id) {
    const response = await api.delete(`/catalogs/equipment-makes/${id}`)
    return response.data
  },

  async getEquipmentMakesDropdown() {
    const response = await api.get('/catalogs/equipment-makes/dropdown')
    return response.data
  },

  // Equipment Models
  async getEquipmentModels(params = {}) {
    return apiUtils.getPaginated('/catalogs/equipment-models', params)
  },

  async getEquipmentModel(id) {
    const response = await api.get(`/catalogs/equipment-models/${id}`)
    return response.data
  },

  async createEquipmentModel(data) {
    const response = await api.post('/catalogs/equipment-models', data)
    return response.data
  },

  async updateEquipmentModel(id, data) {
    const response = await api.put(`/catalogs/equipment-models/${id}`, data)
    return response.data
  },

  async deleteEquipmentModel(id) {
    const response = await api.delete(`/catalogs/equipment-models/${id}`)
    return response.data
  },

  async getModelsByMake(makeId) {
    const response = await api.get(`/catalogs/equipment-models/by-make/${makeId}`)
    return response.data
  },

  // Equipment Trims
  async getEquipmentTrims(params = {}) {
    return apiUtils.getPaginated('/catalogs/equipment-trims', params)
  },

  async getEquipmentTrim(id) {
    const response = await api.get(`/catalogs/equipment-trims/${id}`)
    return response.data
  },

  async createEquipmentTrim(data) {
    const response = await api.post('/catalogs/equipment-trims', data)
    return response.data
  },

  async updateEquipmentTrim(id, data) {
    const response = await api.put(`/catalogs/equipment-trims/${id}`, data)
    return response.data
  },

  async deleteEquipmentTrim(id) {
    const response = await api.delete(`/catalogs/equipment-trims/${id}`)
    return response.data
  },

  async getEquipmentTrimsDropdown(makeId = null, modelId = null) {
    let url = '/catalogs/equipment-trims/dropdown'
    const params = new URLSearchParams()
    if (makeId) params.append('make', makeId)
    if (modelId) params.append('model', modelId)
    if (params.toString()) url += `?${params.toString()}`
    
    const response = await api.get(url)
    return response.data
  },

  async getTrimsByMakeAndModel(makeId, modelId) {
    const response = await api.get(`/catalogs/equipment-trims/by-make-model/${makeId}/${modelId}`)
    return response.data
  },

  // Equipment Catalog (_equipment table)
  async getEquipmentCatalog(params = {}) {
    return apiUtils.getPaginated('/catalogs/equipment-catalog', params)
  },

  async getEquipmentCatalogItem(id) {
    const response = await api.get(`/catalogs/equipment-catalog/${id}`)
    return response.data
  },

  async createEquipmentCatalogItem(data) {
    const response = await api.post('/catalogs/equipment-catalog', data)
    return response.data
  },

  async updateEquipmentCatalogItem(id, data) {
    const response = await api.put(`/catalogs/equipment-catalog/${id}`, data)
    return response.data
  },

  async deleteEquipmentCatalogItem(id) {
    const response = await api.delete(`/catalogs/equipment-catalog/${id}`)
    return response.data
  },

  async getTrimsByModel(makeId, modelId) {
    const response = await api.get(`/catalogs/equipment-models/${makeId}/${modelId}/trims`)
    return response.data
  },

  // Part Types
  async getPartTypes(params = {}) {
    return apiUtils.getPaginated('/catalogs/part-types', params)
  },

  async getPartType(id) {
    const response = await api.get(`/catalogs/part-types/${id}`)
    return response.data
  },

  async createPartType(data) {
    const response = await api.post('/catalogs/part-types', data)
    return response.data
  },

  async updatePartType(id, data) {
    const response = await api.put(`/catalogs/part-types/${id}`, data)
    return response.data
  },

  async deletePartType(id) {
    const response = await api.delete(`/catalogs/part-types/${id}`)
    return response.data
  },

  async getPartTypesDropdown() {
    const response = await api.get('/catalogs/part-types/dropdown')
    return response.data
  },

  // Consumable Types
  async getConsumableTypes(params = {}) {
    return apiUtils.getPaginated('/catalogs/consumable-types', params)
  },

  async getConsumableType(id) {
    const response = await api.get(`/catalogs/consumable-types/${id}`)
    return response.data
  },

  async createConsumableType(data) {
    const response = await api.post('/catalogs/consumable-types', data)
    return response.data
  },

  async updateConsumableType(id, data) {
    const response = await api.put(`/catalogs/consumable-types/${id}`, data)
    return response.data
  },

  async deleteConsumableType(id) {
    const response = await api.delete(`/catalogs/consumable-types/${id}`)
    return response.data
  },

  async getConsumableTypesDropdown() {
    const response = await api.get('/catalogs/consumable-types/dropdown')
    return response.data
  },

  // Maintenance Templates
  async getMaintenanceTemplates(params = {}) {
    return apiUtils.getPaginated('/maintenance/templates', params)
  },

  async getMaintenanceTemplate(id) {
    const response = await api.get(`/maintenance/templates/${id}`)
    return response.data
  },

  async createMaintenanceTemplate(data) {
    const response = await api.post('/maintenance/templates', data)
    return response.data
  },

  async deleteMaintenanceTemplate(id) {
    const response = await api.delete(`/maintenance/templates/${id}`)
    return response.data
  }
}

export default catalogsApi