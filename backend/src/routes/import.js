const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const EquipmentImportService = require('../services/equipmentImportService');
const DefaultTaskImportService = require('../services/defaultTaskImportService');
const { verifyToken, requireAuth } = require('../middleware/auth');
const Joi = require('joi');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../database/logger');

// Configuración de multer para almacenamiento temporal
const upload = multer({
  dest: 'uploads/temp/', // Directorio temporal
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    // Validar que el archivo sea CSV
    console.log('Multer fileFilter:', file.originalname, file.mimetype);

    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.csv') {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. Only CSV files are allowed');
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.code, err.message);
    return res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        field: err.field
      }
    });
  } else if (err) {
    console.error('File upload error:', err.message);
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'FILE_UPLOAD_ERROR',
        message: err.message
      }
    });
  }
  next();
};

// Schema de validación para farm_id
const importEquipmentSchema = Joi.object({
  farm_id: Joi.string().uuid({ version: 'uuidv4' }).required()
});

// Helper para manejar async/await
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/import/equipment
 * Importa equipos desde un archivo CSV
 * @requires Authentication
 * @param {File} csvFile - Archivo CSV con equipos
 * @param {string} farm_id - UUID de la granja (form-data)
 */
router.post('/equipment',
  verifyToken,
  requireAuth,
  upload.single('csvFile'), // 'csvFile' es el nombre del campo en form-data
  handleMulterError, // Manejar errores de multer
  asyncHandler(async (req, res) => {
    let tempFilePath = null;

    try {
      // Validar que se subió un archivo
      if (!req.file) {
        throw new AppError(
          'CSV file is required',
          400,
          'MISSING_FILE'
        );
      }

      tempFilePath = req.file.path;

      // Validar farm_id
      const { error, value } = importEquipmentSchema.validate(req.body);

      if (error) {
        throw new AppError(
          'Validation Error',
          400,
          'VALIDATION_ERROR',
          error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context.value
          }))
        );
      }

      const { farm_id } = value;

      // Llamar al servicio para procesar el CSV
      const result = await EquipmentImportService.importEquipmentFromCSV(
        farm_id,
        tempFilePath,
        req.user?.id // Pasar userId del token
      );

      // Retornar respuesta exitosa
      res.status(200).json({
        success: true,
        data: result,
        message: 'Equipment CSV imported successfully'
      });

    } catch (error) {
      // Re-lanzar el error para que lo maneje el errorHandler
      throw error;
    } finally {
      // Limpiar archivo temporal
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  })
);

/**
 * POST /api/import/maintenance-templates
 * Importa plantillas de mantenimiento predeterminadas desde un archivo CSV
 * @requires Authentication
 * @param {File} csvFile - Archivo CSV con plantillas de mantenimiento
 */
router.post('/maintenance-templates',
  verifyToken,
  requireAuth,
  upload.single('csvFile'), // 'csvFile' es el nombre del campo en form-data
  handleMulterError, // Manejar errores de multer
  asyncHandler(async (req, res) => {
    let tempFilePath = null;

    try {
      // Validar que se subió un archivo
      if (!req.file) {
        throw new AppError(
          'CSV file is required',
          400,
          'MISSING_FILE'
        );
      }

      tempFilePath = req.file.path;

      // Llamar al servicio para procesar el CSV
      const result = await DefaultTaskImportService.importDefaultTasksFromCSV(tempFilePath);

      // Retornar respuesta en formato esperado por el frontend
      res.status(200).json({
        success: true,
        message: `Processed ${result.total} rows: ${result.successful.length} successful, ${result.failed.length} failed`,
        data: {
          summary: {
            total: result.total,
            successful: result.successful.length,
            failed: result.failed.length
          },
          successful: result.successful,
          failed: result.failed
        }
      });

    } catch (error) {
      // Re-lanzar el error para que lo maneje el errorHandler
      throw error;
    } finally {
      // Limpiar archivo temporal
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  })
);

module.exports = router;
