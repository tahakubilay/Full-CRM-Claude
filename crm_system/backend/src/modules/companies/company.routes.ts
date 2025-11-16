// src/modules/companies/company.routes.ts
import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authenticate, authorize } from '../../common/middlewares/auth.middleware';
import { validateRequest } from '../../common/middlewares/validation.middleware';
import {
  createCompanySchema,
  updateCompanySchema,
  queryCompaniesSchema,
} from './company.validation';
import { UserRole } from '@prisma/client';

const router = Router();
const companyController = new CompanyController();

// All routes require authentication
router.use(authenticate);

// List and statistics
router.get('/', validateRequest(queryCompaniesSchema), companyController.getAll);
router.get('/statistics', companyController.getStatistics);
router.get('/export/pdf', companyController.exportToPdf);

// CRUD operations
router.get('/:id', companyController.getById);
router.post('/', authorize(UserRole.ADMIN, UserRole.MANAGER), validateRequest(createCompanySchema), companyController.create);
router.put('/:id', authorize(UserRole.ADMIN, UserRole.MANAGER), validateRequest(updateCompanySchema), companyController.update);
router.delete('/:id', authorize(UserRole.ADMIN), companyController.delete);

// Special operations
router.patch('/:id/archive', authorize(UserRole.ADMIN, UserRole.MANAGER), companyController.archive);
router.post('/:id/duplicate', authorize(UserRole.ADMIN, UserRole.MANAGER), companyController.duplicate);
router.post('/bulk-action', authorize(UserRole.ADMIN, UserRole.MANAGER), companyController.bulkAction);

// Relations
router.get('/:id/brands', companyController.getBrands);
router.get('/:id/documents', companyController.getDocuments);
router.get('/:id/reports', companyController.getReports);
router.get('/:id/activities', companyController.getActivities);
router.get('/:id/statistics', companyController.getCompanyStatistics);

export default router;