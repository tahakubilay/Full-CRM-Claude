// ============================================
// src/modules/companies/company.validation.ts
// ============================================

import { z } from 'zod';

export const createCompanySchema = z.object({
  body: z.object({
    logo: z.string().url().optional(),
    companyName: z.string().min(1, 'Company name is required'),
    taxNumber: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    phones: z.any().optional(),
    emails: z.any().optional(),
    iban: z.string().optional(),
    taxPlate: z.string().url().optional(),
    themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    logo: z.string().url().optional(),
    companyName: z.string().min(1).optional(),
    taxNumber: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    phones: z.any().optional(),
    emails: z.any().optional(),
    iban: z.string().optional(),
    taxPlate: z.string().url().optional(),
    themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  }),
});

export const queryCompaniesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});