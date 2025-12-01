const ProductionBatchClient = require('../clients/productionBatchClient');
const { AppError } = require('../middleware/errorHandler');

class ProductionBatchService {
  static async findAll(options = {}) {
    try {
      const validatedOptions = this.validateFindAllOptions(options);
      const result = await ProductionBatchClient.findAll(validatedOptions);
      return result;
    } catch (error) {
      console.error('Error in ProductionBatchService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      if (!id) {
        throw new AppError('Production batch ID is required', 400, 'MISSING_ID');
      }

      const batch = await ProductionBatchClient.findById(id);
      return batch;
    } catch (error) {
      console.error('Error in ProductionBatchService.findById:', error);
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
      
      const newBatch = await ProductionBatchClient.create(enrichedData);
      return newBatch;
    } catch (error) {
      console.error('Error in ProductionBatchService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      if (!id) {
        throw new AppError('Production batch ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedBatch = await ProductionBatchClient.update(id, updateData);
      return updatedBatch;
    } catch (error) {
      console.error('Error in ProductionBatchService.update:', error);
      throw error;
    }
  }

  static async updateStatus(id, statusData, userContext = {}) {
    try {
      if (!id) {
        throw new AppError('Production batch ID is required', 400, 'MISSING_ID');
      }

      // Validate status data
      this.validateStatusUpdate(statusData);
      
      const { status, notes = '', defective_info = {} } = statusData;
      
      // Business rules validation for status update
      await this.checkBusinessRulesForStatusUpdate(id, status, defective_info);
      
      // Prepare defective_info for database
      const processedDefectiveInfo = this.processDefectiveInfo(defective_info);
      
      // Call the Supabase function
      const result = await ProductionBatchClient.updateStatusWithFunction(
        id,
        status,
        userContext.userId || null,
        notes,
        processedDefectiveInfo
      );
      
      // Check if Supabase function returned an error
      if (result.data && result.data.success === false) {
        throw new AppError(
          result.data.error,
          400,
          result.data.error_code || 'SUPABASE_FUNCTION_ERROR'
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error in ProductionBatchService.updateStatus:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await ProductionBatchClient.getStatistics();
      return stats;
    } catch (error) {
      console.error('Error in ProductionBatchService.getStatistics:', error);
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
      supplier = null,
      date_from = null,
      date_to = null
    } = options;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const allowedSortFields = ['id', 'batch_code', 'status', 'quantity', 'created_at', 'supplier_name'];
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
      supplier,
      date_from,
      date_to
    };
  }

  static validateCreateData(batchData) {
    if (!batchData) {
      throw new AppError('Production batch data is required', 400, 'MISSING_DATA');
    }

    const { quantity, supplier_id } = batchData;

    if (!quantity || quantity <= 0 || quantity > 100) {
      throw new AppError('Quantity must be between 1 and 100', 400, 'INVALID_QUANTITY');
    }

    if (!supplier_id) {
      throw new AppError('Supplier ID is required', 400, 'MISSING_SUPPLIER');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { quantity } = updateData;

    if (quantity !== undefined) {
      if (!quantity || quantity <= 0 || quantity > 100) {
        throw new AppError('Quantity must be between 1 and 100', 400, 'INVALID_QUANTITY');
      }
    }
  }

  static validateStatusUpdate(statusData) {
    if (!statusData) {
      throw new AppError('Status data is required', 400, 'MISSING_DATA');
    }

    const { status, defective_info = {} } = statusData;

    if (!status) {
      throw new AppError('Status is required', 400, 'MISSING_STATUS');
    }

    const allowedStatuses = ['ordered', 'printing', 'completed', 'received', 'cancelled', 'partial'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    // Validate defective_info structure
    if (defective_info && typeof defective_info === 'object') {
      const { defectiveCount, positions, short_codes } = defective_info;

      if (defectiveCount !== undefined) {
        if (!Number.isInteger(defectiveCount) || defectiveCount < 0) {
          throw new AppError('Defective count must be a non-negative integer', 400, 'INVALID_DEFECTIVE_COUNT');
        }
      }

      if (positions !== undefined) {
        if (!Array.isArray(positions)) {
          throw new AppError('Positions must be an array', 400, 'INVALID_POSITIONS_FORMAT');
        }
        
        if (positions.some(pos => !Number.isInteger(pos) || pos < 1)) {
          throw new AppError('All positions must be positive integers', 400, 'INVALID_POSITION_VALUES');
        }
      }

      if (short_codes !== undefined) {
        if (!Array.isArray(short_codes)) {
          throw new AppError('Short codes must be an array', 400, 'INVALID_SHORT_CODES_FORMAT');
        }
        
        if (short_codes.some(code => typeof code !== 'string' || !code.trim())) {
          throw new AppError('All short codes must be non-empty strings', 400, 'INVALID_SHORT_CODE_VALUES');
        }
      }
    }
  }

  static async checkBusinessRulesForCreate(batchData) {
    // Add any business rules for batch creation
    // For example: check supplier exists, validate against quotas, etc.
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Add any business rules for batch update
    // For example: check if batch can be modified based on status
  }

  static async checkBusinessRulesForStatusUpdate(id, status, defective_info) {
    // For 'received' status with defective count > 0, require defective details
    if (status === 'received' && defective_info.defectiveCount > 0) {
      const { positions, short_codes } = defective_info;
      
      // Must provide either positions or short_codes (or both)
      if ((!positions || positions.length === 0) && (!short_codes || short_codes.length === 0)) {
        throw new AppError(
          'When defective count > 0, you must specify defective QR codes using positions and/or short_codes',
          400,
          'MISSING_DEFECTIVE_DETAILS'
        );
      }

      // Validate that the total defective items match the count
      const positionsCount = positions ? positions.length : 0;
      const shortCodesCount = short_codes ? short_codes.length : 0;
      const totalSpecified = positionsCount + shortCodesCount;

      if (totalSpecified !== defective_info.defectiveCount) {
        throw new AppError(
          `Defective count (${defective_info.defectiveCount}) must match the total number of specified positions and short codes (${totalSpecified})`,
          400,
          'DEFECTIVE_COUNT_MISMATCH'
        );
      }
    }
  }

  static processDefectiveInfo(defective_info) {
    if (!defective_info || Object.keys(defective_info).length === 0) {
      return {};
    }

    const processed = {};
    
    if (defective_info.positions && defective_info.positions.length > 0) {
      processed.positions = defective_info.positions;
    }
    
    if (defective_info.short_codes && defective_info.short_codes.length > 0) {
      processed.short_codes = defective_info.short_codes;
    }
    
    return processed;
  }
}

module.exports = ProductionBatchService;