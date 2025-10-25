const express = require('express');
const router = express.Router();

// Placeholder reports routes
router.get('/dashboard', (req, res) => {
  res.json({ success: true, data: {}, message: 'Dashboard reports endpoint - coming soon' });
});

module.exports = router;
