import Joi from 'joi';

// Joi schemas are defined separately from the Mongoose model intentionally.
// The model handles DB structure; Joi handles what the API accepts.
// This separation means you can have stricter or looser rules at the API boundary
// without touching the DB schema — important in regulated apps.

export const createTodoSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(1000).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  dueDate: Joi.date().iso().greater('now').optional(),
  tags: Joi.array().items(Joi.string().trim()).max(10).default([]),
});

export const updateTodoSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(1000).allow('').optional(),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional().allow(null),
  tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
}).min(1); // at least one field required on update
