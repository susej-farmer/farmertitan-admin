const express = require('express');
const router = express.Router();

const SystemStatsService = require('../services/systemStatsService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth } = require('../middleware/auth');

/**
 * @swagger
 * /api/reports/system-stats:
 *   get:
 *     summary: Get system-wide statistics
 *     description: Retrieve comprehensive statistics about equipment, farms, and QR codes
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     equipment:
 *                       type: object
 *                       properties:
 *                         active_count:
 *                           type: integer
 *                         total_count:
 *                           type: integer
 *                         inactive_count:
 *                           type: integer
 *                     farms:
 *                       type: object
 *                       properties:
 *                         active_count:
 *                           type: integer
 *                         total_count:
 *                           type: integer
 *                         inactive_count:
 *                           type: integer
 *                         total_acres:
 *                           type: number
 *                         active_acres:
 *                           type: number
 *                     qr:
 *                       type: object
 *                       properties:
 *                         bound_count:
 *                           type: integer
 *                         total_count:
 *                           type: integer
 *                         unbound_count:
 *                           type: integer
 *                         status_breakdown:
 *                           type: object
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     operation:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/system-stats',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await SystemStatsService.getSystemStats(req);
    res.json(result);
  })
);

// Placeholder dashboard route
router.get('/dashboard', (req, res) => {
  res.json({ success: true, data: {}, message: 'Dashboard reports endpoint - coming soon' });
});

module.exports = router;
