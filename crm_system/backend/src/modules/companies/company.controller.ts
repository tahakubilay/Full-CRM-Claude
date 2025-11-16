// src/modules/companies/company.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CompanyService } from './company.service';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.companyService.getAll(req.query);
      res.status(200).json(
        new ApiResponse(200, 'Companies retrieved successfully', result.data, result.meta)
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.getById(req.params.id);
      res.status(200).json(
        new ApiResponse(200, 'Company retrieved successfully', company)
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.create(req.body, req.user!.id);
      res.status(201).json(
        new ApiResponse(201, 'Company created successfully', company)
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.update(req.params.id, req.body, req.user!.id);
      res.status(200).json(
        new ApiResponse(200, 'Company updated successfully', company)
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.companyService.delete(req.params.id, req.user!.id);
      res.status(200).json(
        new ApiResponse(200, 'Company deleted successfully')
      );
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.archive(req.params.id, req.user!.id);
      res.status(200).json(
        new ApiResponse(200, 'Company archived successfully', company)
      );
    } catch (error) {
      next(error);
    }
  };

  duplicate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.duplicate(req.params.id, req.user!.id);
      res.status(201).json(
        new ApiResponse(201, 'Company duplicated successfully', company)
      );
    } catch (error) {
      next(error);
    }
  };

  bulkAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.companyService.bulkAction(
        req.body.action,
        req.body.ids,
        req.user!.id
      );
      res.status(200).json(
        new ApiResponse(200, 'Bulk action completed successfully', result)
      );
    } catch (error) {
      next(error);
    }
  };

  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.companyService.getStatistics();
      res.status(200).json(
        new ApiResponse(200, 'Statistics retrieved successfully', stats)
      );
    } catch (error) {
      next(error);
    }
  };

  getCompanyStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.companyService.getCompanyStatistics(req.params.id);
      res.status(200).json(
        new ApiResponse(200, 'Company statistics retrieved successfully', stats)
      );
    } catch (error) {
      next(error);
    }
  };

  getBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brands = await this.companyService.getBrands(req.params.id);
      res.status(200).json(
        new ApiResponse(200, 'Brands retrieved successfully', brands)
      );
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = await this.companyService.getDocuments(req.params.id);
      res.status(200).json(
        new ApiResponse(200, 'Documents retrieved successfully', documents)
      );
    } catch (error) {
      next(error);
    }
  };

  getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reports = await this.companyService.getReports(req.params.id);
      res.status(200).json(
        new ApiResponse(200, 'Reports retrieved successfully', reports)
      );
    } catch (error) {
      next(error);
    }
  };

  getActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activities = await this.companyService.getActivities(req.params.id);
      res.status(200).json(
        new ApiResponse(200, 'Activities retrieved successfully', activities)
      );
    } catch (error) {
      next(error);
    }
  };

  exportToPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pdfBuffer = await this.companyService.exportToPdf(req.query);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=companies.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };
}