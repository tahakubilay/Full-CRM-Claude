// ============================================
// src/modules/companies/company.service.ts
// ============================================

import { prisma } from '../../main';
import { ApiError } from '../../common/utils/ApiError';
import { EntityStatus, Prisma } from '@prisma/client';

interface CreateCompanyDTO {
  logo?: string;
  companyName: string;
  taxNumber?: string;
  country?: string;
  city?: string;
  district?: string;
  address?: string;
  phones?: any;
  emails?: any;
  iban?: string;
  taxPlate?: string;
  themeColor?: string;
  status?: EntityStatus;
}

interface QueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: EntityStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CompanyService {
  async getAll(query: QueryParams) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;
    const search = query.search || '';
    const status = query.status;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Build where clause
    const where: Prisma.CompanyWhereInput = {
      AND: [
        search ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { taxNumber: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        status ? { status } : {},
      ],
    };

    // Get companies
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              brands: true,
              documents: true,
              reports: true,
            },
          },
        },
      }),
      prisma.company.count({ where }),
    ]);

    return {
      data: companies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        brands: {
          select: {
            id: true,
            brandName: true,
            themeColor: true,
            status: true,
            _count: {
              select: { branches: true },
            },
          },
        },
        _count: {
          select: {
            brands: true,
            documents: true,
            reports: true,
            investments: true,
          },
        },
      },
    });

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    return company;
  }

  async create(data: CreateCompanyDTO, userId: string) {
    const company = await prisma.company.create({
      data: {
        ...data,
        themeColor: data.themeColor || '#3B82F6',
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(company.id, 'CREATE', userId, null, company);

    return company;
  }

  async update(id: string, data: Partial<CreateCompanyDTO>, userId: string) {
    // Get old data for audit
    const oldCompany = await prisma.company.findUnique({ where: { id } });
    
    if (!oldCompany) {
      throw new ApiError(404, 'Company not found');
    }

    const company = await prisma.company.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // If theme color changed, propagate to brands
    if (data.themeColor && data.themeColor !== oldCompany.themeColor) {
      await this.propagateThemeColor(id, data.themeColor);
    }

    // Log activity
    await this.logActivity(id, 'UPDATE', userId, oldCompany, company);

    return company;
  }

  async delete(id: string, userId: string) {
    const company = await prisma.company.findUnique({ where: { id } });
    
    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    await prisma.company.delete({ where: { id } });

    // Log activity
    await this.logActivity(id, 'DELETE', userId, company, null);
  }

  async archive(id: string, userId: string) {
    const company = await prisma.company.update({
      where: { id },
      data: { status: EntityStatus.ARCHIVED },
    });

    await this.logActivity(id, 'ARCHIVE', userId, null, company);

    return company;
  }

  async duplicate(id: string, userId: string) {
    const original = await prisma.company.findUnique({
      where: { id },
    });

    if (!original) {
      throw new ApiError(404, 'Company not found');
    }

    const duplicate = await prisma.company.create({
      data: {
        ...original,
        id: undefined,
        companyName: `${original.companyName} (Copy)`,
        taxNumber: undefined, // Clear unique fields
        createdBy: userId,
        createdAt: undefined,
        updatedAt: undefined,
      },
    });

    await this.logActivity(duplicate.id, 'DUPLICATE', userId, original, duplicate);

    return duplicate;
  }

  async bulkAction(action: string, ids: string[], userId: string) {
    let result: any = {};

    switch (action) {
      case 'delete':
        result = await prisma.company.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      case 'archive':
        result = await prisma.company.updateMany({
          where: { id: { in: ids } },
          data: { status: EntityStatus.ARCHIVED },
        });
        break;

      case 'activate':
        result = await prisma.company.updateMany({
          where: { id: { in: ids } },
          data: { status: EntityStatus.ACTIVE },
        });
        break;

      default:
        throw new ApiError(400, 'Invalid bulk action');
    }

    // Log bulk activity
    for (const id of ids) {
      await this.logActivity(id, `BULK_${action.toUpperCase()}`, userId, null, null);
    }

    return {
      action,
      count: result.count || ids.length,
      ids,
    };
  }

  async getStatistics() {
    const [total, active, draft, archived] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: EntityStatus.ACTIVE } }),
      prisma.company.count({ where: { status: EntityStatus.DRAFT } }),
      prisma.company.count({ where: { status: EntityStatus.ARCHIVED } }),
    ]);

    return {
      total,
      active,
      draft,
      archived,
    };
  }

  async getCompanyStatistics(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            brands: true,
            documents: true,
            reports: true,
            investments: true,
          },
        },
      },
    });

    if (!company) {
      throw new ApiError(404, 'Company not found');
    }

    // Get brand count with branches
    const brands = await prisma.brand.findMany({
      where: { companyId: id },
      include: {
        _count: {
          select: { branches: true },
        },
      },
    });

    const totalBranches = brands.reduce((sum, brand) => sum + brand._count.branches, 0);

    return {
      companyInfo: {
        name: company.companyName,
        status: company.status,
      },
      counts: {
        brands: company._count.brands,
        branches: totalBranches,
        documents: company._count.documents,
        reports: company._count.reports,
        investments: company._count.investments,
      },
    };
  }

  async getBrands(companyId: string) {
    return prisma.brand.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { branches: true },
        },
      },
    });
  }

  async getDocuments(companyId: string) {
    return prisma.document.findMany({
      where: {
        entityType: 'COMPANY',
        entityId: companyId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReports(companyId: string) {
    return prisma.report.findMany({
      where: {
        entityType: 'COMPANY',
        entityId: companyId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActivities(companyId: string) {
    return prisma.activity.findMany({
      where: {
        entityType: 'COMPANY',
        entityId: companyId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async exportToPdf(query: any) {
    // In a real implementation, use a PDF library like puppeteer or pdfkit
    // For now, return a placeholder
    return Buffer.from('PDF export not implemented yet');
  }

  private async propagateThemeColor(companyId: string, themeColor: string) {
    // Update all brands that don't have custom theme
    await prisma.brand.updateMany({
      where: {
        companyId,
        themeColor: null, // Only update brands without custom theme
      },
      data: { themeColor },
    });
  }

  private async logActivity(
    entityId: string,
    action: string,
    userId: string,
    oldData: any,
    newData: any
  ) {
    try {
      await prisma.activity.create({
        data: {
          entityType: 'COMPANY',
          entityId,
          action,
          description: `Company ${action.toLowerCase()}`,
          metadata: { oldData, newData },
          performedBy: userId,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}