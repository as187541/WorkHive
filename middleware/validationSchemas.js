const Joi = require('joi');
const mongoose = require('mongoose');

/**
 * Generic validation middleware factory.
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} source - req property to validate: 'body', 'query', 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(d => d.message).join('; ');
      return res.status(400).json({
        msg: 'Validation error',
        errors: messages
      });
    }

    // Replace req[source] with validated/sanitized value
    req[source] = value;
    next();
  };
};

// ─── COMMON SCHEMAS ───

const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'MongoDB ObjectId validation').messages({
  'any.invalid': 'Invalid ID format'
});

const emailSchema = Joi.string().email().lowercase().trim().max(254);

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[0-9]/, 'digit')
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.name': 'Password must contain at least one {#name} letter',
    'string.pattern.uppercase': 'Password must contain at least one uppercase letter',
    'string.pattern.lowercase': 'Password must contain at least one lowercase letter',
    'string.pattern.digit': 'Password must contain at least one digit'
  });

// ─── AUTH SCHEMAS ───

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: emailSchema.required(),
  password: passwordSchema.required()
});

const loginSchema = Joi.object({
  email: emailSchema.required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: emailSchema.required()
});

const resetPasswordSchema = Joi.object({
  email: emailSchema.required(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must be exactly 6 digits'
  }),
  newPassword: passwordSchema.required()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  password: passwordSchema.optional(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// ─── REDEMPTION SCHEMAS ───

const createRedemptionSchema = Joi.object({
  rewardTitle: Joi.string().trim().min(1).max(200).required(),
  cost: Joi.number().integer().min(1).required(),
  workspaceId: objectIdSchema.required(),
  projectId: objectIdSchema.optional()
});

const redemptionPaginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('Pending', 'Approved', 'Denied', 'All').default('All')
});

// ─── ORDER SCHEMAS ───

const createOrderSchema = Joi.object({
  servicePackageId: objectIdSchema.optional(),
  proposalId: objectIdSchema.optional(),
  workspaceId: objectIdSchema.required(),
  projectId: objectIdSchema.optional(),
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(5000).optional(),
  price: Joi.number().min(0).optional(),
  currency: Joi.string().valid('HT', 'USD').default('HT'),
  deliveryDays: Joi.number().integer().min(1).optional(),
  revisions: Joi.number().integer().min(0).default(0),
  features: Joi.array().items(Joi.string().trim().max(100)).max(20).optional(),
  milestones: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().min(1).max(200).required(),
      description: Joi.string().trim().max(1000).optional(),
      amount: Joi.number().min(0).required(),
      dueDate: Joi.date().iso().optional()
    })
  ).max(10).optional(),
  sellerId: objectIdSchema.optional()
}).custom((value, helpers) => {
  if (!value.servicePackageId && !value.proposalId && !value.title) {
    return helpers.error('object.missing');
  }
  return value;
}).messages({
  'object.missing': 'Either servicePackageId, proposalId, or title must be provided'
});

const disputeSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(2000).required()
});

const resolveDisputeSchema = Joi.object({
  outcome: Joi.string().valid('Refund Buyer', 'Release to Seller', 'Split').required(),
  resolution: Joi.string().trim().max(2000).optional()
});

// ─── WORKSPACE SCHEMAS ───

const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(1000).optional(),
  tokenBudget: Joi.number().min(0).default(Infinity)
});

// ─── ADMIN SCHEMAS ───

const alterTokensSchema = Joi.object({
  amount: Joi.number().integer().required(),
  reason: Joi.string().trim().min(1).max(500).optional(),
  workspaceId: objectIdSchema.optional()
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('User', 'SuperAdmin').required()
});

module.exports = {
  validate,
  // Auth
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  // Redemption
  createRedemptionSchema,
  redemptionPaginationSchema,
  // Order
  createOrderSchema,
  disputeSchema,
  resolveDisputeSchema,
  // Workspace
  createWorkspaceSchema,
  // Admin
  alterTokensSchema,
  updateRoleSchema
};
