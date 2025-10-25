const QRSupplierClient = require('../clients/qrSupplierClient');

class QRSupplierService {
  static async getAllSuppliers(options = {}) {
    try {
      const result = await QRSupplierClient.getAll(options);
      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('QRSupplierService.getAllSuppliers error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve suppliers',
          details: error.message
        }
      };
    }
  }
}

module.exports = QRSupplierService;