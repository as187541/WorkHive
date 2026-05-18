// routes/automationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createRule,
  getWorkspaceRules,
  updateRule,
  deleteRule,
  toggleRule,
  getTemplates
} = require('../controllers/automationController');

router.use(protect); // All routes require authentication

router.get('/templates', getTemplates);
router.get('/workspace/:workspaceId', getWorkspaceRules);
router.post('/', createRule);
router.patch('/:id', updateRule);
router.patch('/:id/toggle', toggleRule);
router.delete('/:id', deleteRule);

module.exports = router;