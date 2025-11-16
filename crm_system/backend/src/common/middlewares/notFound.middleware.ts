// ============================================
// src/common/middlewares/notFound.middleware.ts
// ============================================

import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404 as number).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${(req as any).originalUrl}`,
  });
};