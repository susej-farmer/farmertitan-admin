const express = require('express');
const router = express.Router();

const FarmService = require('../services/farmService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth } = require('../middleware/auth');
const {
  validateFarm,
  validateFarmUpdate,
  validateId,
  validatePaginatedQuery
} = require('../middleware/validation');

/**
 * @swagger
 * /api/farms:
 *   get:
 *     summary: Get all farms
 *     description: Retrieve a paginated list of farms with optional search filtering
 *     tags: [Farms]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for farm name or location
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Farm'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get all farms
router.get('/',
  verifyToken,
  requireAuth,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await FarmService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Get all equipment for a specific farm (must be before /:id to avoid route conflict)
router.get('/:id/equipment',
  verifyToken,
  requireAuth,
  validateId,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const EquipmentService = require('../services/equipmentService');

    // Pass all validated query params directly
    const result = await EquipmentService.findByFarm(req.params.id, req.query);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * @swagger
 * /api/farms/{id}:
 *   get:
 *     summary: Get farm by ID
 *     description: Retrieve detailed information about a specific farm
 *     tags: [Farms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Farm ID
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Farm'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get farm by ID
router.get('/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.findById(req.params.id);
    res.json({
      success: true,
      data: farm
    });
  })
);

/**
 * @swagger
 * /api/farms:
 *   post:
 *     summary: Create new farm
 *     description: Create a new farm with the provided information
 *     tags: [Farms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *                 example: Green Valley Farm
 *               location:
 *                 type: string
 *                 example: Santa Cruz, California
 *               area:
 *                 type: number
 *                 example: 150.5
 *                 description: Area in hectares
 *               description:
 *                 type: string
 *                 example: Organic vegetable farm
 *     responses:
 *       201:
 *         description: Farm created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Farm'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Create new farm
router.post('/',
  verifyToken,
  requireAuth,
  validateFarm,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.create(req.body);
    res.status(201).json({
      success: true,
      data: farm,
      message: 'Farm created successfully'
    });
  })
);

// Update farm
router.put('/:id',
  verifyToken,
  requireAuth,
  validateId,
  validateFarmUpdate,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: farm,
      message: 'Farm updated successfully'
    });
  })
);

// Delete farm
router.delete('/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    await FarmService.delete(req.params.id);
    res.json({
      success: true,
      message: 'Farm deleted successfully'
    });
  })
);

// Activate farm
router.patch('/:id/activate',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.activate(req.params.id);
    res.json({
      success: true,
      data: farm,
      message: 'Farm activated successfully'
    });
  })
);

// Deactivate farm
router.patch('/:id/deactivate',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.deactivate(req.params.id);
    res.json({
      success: true,
      data: farm,
      message: 'Farm deactivated successfully'
    });
  })
);

// Get farm statistics
router.get('/stats/overview',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await FarmService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;
