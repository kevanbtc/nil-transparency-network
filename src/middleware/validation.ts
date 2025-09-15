import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../types';

interface ValidationOptions {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}

export const validateRequest = (schemas: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: string[] = [];

    // Validate request body
    if (schemas.body) {
      const { error } = schemas.body.validate(req.body, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Body: ${detail.message}`));
      }
    }

    // Validate query parameters
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Query: ${detail.message}`));
      } else {
        // Replace query with validated/transformed values
        req.query = value;
      }
    }

    // Validate URL parameters
    if (schemas.params) {
      const { error } = schemas.params.validate(req.params, { abortEarly: false });
      if (error) {
        validationErrors.push(...error.details.map(detail => `Params: ${detail.message}`));
      }
    }

    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors.join('; '));
    }

    next();
  };
};