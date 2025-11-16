// ============================================
// src/common/utils/ApiResponse.ts
// ============================================

export class ApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: any;
  meta?: any;

  constructor(
    statusCode: number,
    message: string,
    data?: any,
    meta?: any
  ) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    if (data) this.data = data;
    if (meta) this.meta = meta;
  }
}