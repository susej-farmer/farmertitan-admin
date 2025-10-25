import api from './api'

export const catalogApi = {
  // Get equipment types for dropdown
  async getEquipmentTypes() {
    const response = await api.get('/catalogs/equipment-types/dropdown')
    return response.data
  },

  // Get equipment makes for dropdown  
  async getEquipmentMakes() {
    const response = await api.get('/catalogs/equipment-makes/dropdown')
    return response.data
  },

  // Get equipment models by make
  async getEquipmentModelsByMake(makeId) {
    const response = await api.get(`/catalogs/equipment-models/by-make/${makeId}`)
    return response.data
  },

  // Get equipment trims by make and model
  async getEquipmentTrimsByModel(makeId, modelId) {
    const response = await api.get(`/catalogs/equipment-models/${makeId}/${modelId}/trims`)
    return response.data
  }
}

export default catalogApi