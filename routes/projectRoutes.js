// routes/projectRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true }); 

// Middleware for File Uploads
const upload = require('../middleware/multer');

// Controllers
const { 
  createProject, 
  getProjectsForWorkspace, 
  updateProject, 
  deleteProject 
} = require('../controllers/projectController');

const { 
  createTask, 
  getProjectTasks, 
  updateTask, 
  deleteTask,
  uploadAttachment // <--- New Controller Function
} = require('../controllers/taskController');

const { 
  addComment, 
  getTaskComments 
} = require('../controllers/commentController');

const { protect } = require('../middleware/authMiddleware');

// --- ATTACHMENT ROUTES ---
// Endpoint: /api/v1/workspaces/:workspaceId/projects/tasks/:id/attachments
router.post('/tasks/:id/attachments', protect, upload.single('file'), uploadAttachment);

// --- COMMENT ROUTES ---
router.route('/tasks/:taskId/comments')
  .get(protect, getTaskComments)
  .post(protect, addComment);

// --- TASK ROUTES ---
router.route('/:projectId/tasks')
  .get(protect, getProjectTasks)
  .post(protect, createTask);

router.route('/tasks/:id')
  .patch(protect, updateTask)
  .delete(protect, deleteTask);

// --- PROJECT ROUTES ---
router.route('/')
  .get(protect, getProjectsForWorkspace)
  .post(protect, createProject);

router.route('/:projectId')
  .patch(protect, updateProject)
  .delete(protect, deleteProject);

module.exports = router;