const QRDeliveryBatchClient = require('../clients/qrDeliveryBatchClient');
const { AppError } = require('../middleware/errorHandler');

class QRDeliveryBatchService {
  static async findAll(options = {}) {
    try {
      const validatedOptions = this.validateFindAllOptions(options);
      const result = await QRDeliveryBatchClient.getAll(validatedOptions);
      return result;
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      if (!id) {
        throw new AppError('Delivery batch ID is required', 400, 'MISSING_ID');
      }

      const batch = await QRDeliveryBatchClient.get(id);
      if (!batch) {
        throw new AppError('Delivery batch not found', 404, 'BATCH_NOT_FOUND');
      }
      
      return batch;
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.findById:', error);
      throw error;
    }
  }

  static async findByDeliveryCode(deliveryCode) {
    try {
      if (!deliveryCode) {
        throw new AppError('Delivery code is required', 400, 'MISSING_DELIVERY_CODE');
      }

      const batch = await QRDeliveryBatchClient.getByDeliveryCode(deliveryCode);
      if (!batch) {
        throw new AppError('Delivery batch not found', 404, 'BATCH_NOT_FOUND');
      }
      
      return batch;
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.findByDeliveryCode:', error);
      throw error;
    }
  }

  static async create(batchData, userContext = {}) {
    try {
      this.validateCreateData(batchData);
      
      const enrichedData = {
        ...batchData,
        created_by: userContext.userId || null
      };
      
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newBatch = await QRDeliveryBatchClient.create(enrichedData);
      return {
        data: newBatch,
        message: 'Delivery batch created successfully'
      };
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData, userContext = {}) {
    try {
      if (!id) {
        throw new AppError('Delivery batch ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedBatch = await QRDeliveryBatchClient.update(id, updateData);
      return {
        data: updatedBatch,
        message: 'Delivery batch updated successfully'
      };
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.update:', error);
      throw error;
    }
  }

  static async updateStatus(id, statusData, userContext = {}) {
    try {
      if (!id) {
        throw new AppError('Delivery batch ID is required', 400, 'MISSING_ID');
      }

      // Validate status data
      this.validateStatusUpdate(statusData);
      
      const { status, notes = '' } = statusData;
      
      // Business rules validation for status update
      await this.checkBusinessRulesForStatusUpdate(id, status);
      
      // Update the status
      const result = await QRDeliveryBatchClient.updateStatus(
        id,
        status,
        userContext.userId || null,
        notes
      );
      
      return {
        data: result,
        message: `Delivery batch status updated to ${status}`
      };
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.updateStatus:', error);
      throw error;
    }
  }

  static async delete(id, userContext = {}) {
    try {
      if (!id) {
        throw new AppError('Delivery batch ID is required', 400, 'MISSING_ID');
      }

      await this.checkBusinessRulesForDelete(id);
      
      const result = await QRDeliveryBatchClient.delete(id);
      return {
        success: result,
        message: 'Delivery batch deleted successfully'
      };
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.delete:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await QRDeliveryBatchClient.getStatistics();
      return stats;
    } catch (error) {
      console.error('Error in QRDeliveryBatchService.getStatistics:', error);
      throw error;
    }
  }

  // Private validation methods
  static validateFindAllOptions(options) {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search = '',
      status = null,
      farm_id = null,
      date_from = null,
      date_to = null
    } = options;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const allowedSortFields = ['id', 'delivery_code', 'current_status', 'requested_quantity', 'created_at', 'farm'];
    const validatedSort = allowedSortFields.includes(sort) ? sort : 'created_at';

    const validatedOrder = ['asc', 'desc'].includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';
    const validatedSearch = typeof search === 'string' ? search.trim().substring(0, 100) : '';

    return {
      page: validatedPage,
      limit: validatedLimit,
      sort: validatedSort,
      order: validatedOrder,
      search: validatedSearch,
      status,
      farm_id,
      date_from,
      date_to
    };
  }

  static validateCreateData(batchData) {
    if (!batchData) {
      throw new AppError('Delivery batch data is required', 400, 'MISSING_DATA');
    }

    const { farm_id, requested_quantity } = batchData;

    // Basic client-side validation - stored procedure handles the rest
    if (!farm_id) {
      throw new AppError('Farm ID is required', 400, 'MISSING_FARM_ID');
    }

    if (!requested_quantity || requested_quantity <= 0 || requested_quantity > 1000) {
      throw new AppError('Requested quantity must be between 1 and 1000', 400, 'INVALID_QUANTITY');
    }

    if (!Number.isInteger(requested_quantity)) {
      throw new AppError('Requested quantity must be an integer', 400, 'INVALID_QUANTITY_TYPE');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { delivery_code, requested_quantity } = updateData;

    if (delivery_code !== undefined) {
      if (!delivery_code || typeof delivery_code !== 'string' || delivery_code.trim().length === 0) {
        throw new AppError('Delivery code must be a non-empty string', 400, 'INVALID_DELIVERY_CODE');
      }

      if (delivery_code.length > 50) {
        throw new AppError('Delivery code cannot exceed 50 characters', 400, 'DELIVERY_CODE_TOO_LONG');
      }
    }

    if (requested_quantity !== undefined) {
      if (!requested_quantity || requested_quantity <= 0 || requested_quantity > 1000) {
        throw new AppError('Requested quantity must be between 1 and 1000', 400, 'INVALID_QUANTITY');
      }

      if (!Number.isInteger(requested_quantity)) {
        throw new AppError('Requested quantity must be an integer', 400, 'INVALID_QUANTITY_TYPE');
      }
    }
  }

  static validateStatusUpdate(statusData) {
    if (!statusData) {
      throw new AppError('Status data is required', 400, 'MISSING_DATA');
    }

    const { status } = statusData;

    if (!status) {
      throw new AppError('Status is required', 400, 'MISSING_STATUS');
    }

    const allowedStatuses = ['requested', 'in_progress', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }
  }

  static async checkBusinessRulesForCreate(batchData) {
    // Stored procedure handles all business rules:
    // - Farm existence validation
    // - User existence validation  
    // - Delivery code generation and uniqueness
    // - Quantity validation
    // - Notes validation
    // Additional business rules can be added here if needed
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Get existing batch to check current state
    const existingBatch = await QRDeliveryBatchClient.get(id);
    if (!existingBatch) {
      throw new AppError('Delivery batch not found', 404, 'BATCH_NOT_FOUND');
    }

    // Check if delivery code is unique (if being updated)
    if (updateData.delivery_code && updateData.delivery_code !== existingBatch.delivery_code) {
      try {
        const duplicateBatch = await QRDeliveryBatchClient.getByDeliveryCode(updateData.delivery_code);
        if (duplicateBatch && duplicateBatch.id !== id) {
          throw new AppError('Delivery code already exists', 400, 'DUPLICATE_DELIVERY_CODE');
        }
      } catch (error) {
        if (error.code !== 'BATCH_NOT_FOUND') {
          throw error;
        }
      }
    }

    // Check if batch can be modified based on status
    if (existingBatch.current_status === 'delivered') {
      throw new AppError('Cannot modify a delivered batch', 400, 'BATCH_ALREADY_DELIVERED');
    }

    if (existingBatch.current_status === 'cancelled') {
      throw new AppError('Cannot modify a cancelled batch', 400, 'BATCH_CANCELLED');
    }
  }

  static async checkBusinessRulesForStatusUpdate(id, newStatus) {
    // Get existing batch to check current state
    const existingBatch = await QRDeliveryBatchClient.get(id);
    if (!existingBatch) {
      throw new AppError('Delivery batch not found', 404, 'BATCH_NOT_FOUND');
    }

    const currentStatus = existingBatch.current_status;

    // Define valid status transitions
    const validTransitions = {
      'requested': ['in_progress', 'cancelled'],
      'in_progress': ['delivered', 'cancelled'],
      'delivered': [], // No transitions from delivered
      'cancelled': [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // Get existing batch to check current state
    const existingBatch = await QRDeliveryBatchClient.get(id);
    if (!existingBatch) {
      throw new AppError('Delivery batch not found', 404, 'BATCH_NOT_FOUND');
    }

    // Don't allow deletion of delivered batches
    if (existingBatch.current_status === 'delivered') {
      throw new AppError('Cannot delete a delivered batch', 400, 'CANNOT_DELETE_DELIVERED');
    }
  }
}

module.exports = QRDeliveryBatchService;