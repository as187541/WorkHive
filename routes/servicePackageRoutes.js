const express = require('express');
const router = express.Router();

const {
  createServicePackage,
  getMyServicePackages,
  getServicePackageById,
  updateServicePackage,
  deleteServicePackage,
  browseServicePackages,
  getFreelancerServices,
  orderServicePackage
} = require('../controllers/servicePackageController');

const { protect } = require('../middleware/authMiddleware');

// My services (freelancer management) — MUST be before /:id
router.get('/my/services', protect, getMyServicePackages);

// Public browse routes
router.get('/', protect, browseServicePackages);
router.get('/freelancer/:userId', protect, getFreelancerServices);
router.get('/:id', protect, getServicePackageById);

// Service package CRUD
router.post('/', protect, createServicePackage);
router.patch('/:id', protect, updateServicePackage);
router.delete('/:id', protect, deleteServicePackage);

// Order a service
router.post('/:id/order', protect, orderServicePackage);

module.exports = router;
