// ============================================
// src/common/middlewares/rateLimit.middleware.ts
// ============================================

import rateLimit from 'express-rate-limit';

export const rateLimiter = (max: number, windowMinutes: number) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};