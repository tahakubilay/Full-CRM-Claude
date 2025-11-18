import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBrandDto, UpdateBrandDto, BrandFilterDto } from './dto/brand.dto';
import { Status } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto, userId: string) {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: createBrandDto.companyId },
      select: { themeColor: true }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Inherit theme color from company if not provided
    const themeColor = createBrandDto.themeColor || company.themeColor;

    const brand = await this.prisma.brand.create({
      data: {
        ...createBrandDto,
        themeColor,
        createdBy: userId,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            themeColor: true,
          }
        },
        _count: {
          select: {
            branches: true,
            documents: true,
          }
        }
      }
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        entityType: 'BRAND',
        entityId: brand.id,
        action: 'CREATE',
        description: `Brand "${brand.brandName}" created`,
        performedBy: userId,
      }
    });

    return brand;
  }

  async findAll(filters: BrandFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { brandName: { contains: search, mode: 'insensitive' } },
        { taxNumber: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: {
            select: {
              id: true,
              companyName: true,
              themeColor: true,
            }
          },
          _count: {
            select: {
              branches: true,
              documents: true,
            }
          }
        }
      }),
      this.prisma.brand.count({ where })
    ]);

    return {
      data: brands,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            logo: true,
            themeColor: true,
          }
        },
        branches: {
          select: {
            id: true,
            branchName: true,
            city: true,
            status: true,
            _count: {
              select: {
                people: true,
              }
            }
          }
        },
        documents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            type: true,
            documentDate: true,
            status: true,
          }
        },
        _count: {
          select: {
            branches: true,
            documents: true,
          }
        }
      }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto, userId: string) {
    const existingBrand = await this.prisma.brand.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!existingBrand) {
      throw new NotFoundException('Brand not found');
    }

    // If companyId is being changed, verify new company exists and get theme
    let themeColor = updateBrandDto.themeColor;
    if (updateBrandDto.companyId && updateBrandDto.companyId !== existingBrand.companyId) {
      const newCompany = await this.prisma.company.findUnique({
        where: { id: updateBrandDto.companyId }
      });

      if (!newCompany) {
        throw new NotFoundException('New company not found');
      }

      // Inherit theme from new company if not explicitly set
      if (!themeColor) {
        themeColor = newCompany.themeColor;
      }
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        ...updateBrandDto,
        ...(themeColor && { themeColor }),
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            themeColor: true,
          }
        },
        _count: {
          select: {
            branches: true,
            documents: true,
          }
        }
      }
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        entityType: 'BRAND',
        entityId: brand.id,
        action: 'UPDATE',
        description: `Brand "${brand.brandName}" updated`,
        performedBy: userId,
      }
    });

    return brand;
  }

  async remove(id: string, userId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: { brandName: true }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    await this.prisma.brand.delete({
      where: { id }
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        entityType: 'BRAND',
        entityId: id,
        action: 'DELETE',
        description: `Brand "${brand.brandName}" deleted`,
        performedBy: userId,
      }
    });

    return { message: 'Brand deleted successfully' };
  }

  async archive(id: string, userId: string) {
    const brand = await this.prisma.brand.update({
      where: { id },
      data: { status: Status.ARCHIVED }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'BRAND',
        entityId: id,
        action: 'ARCHIVE',
        description: `Brand "${brand.brandName}" archived`,
        performedBy: userId,
      }
    });

    return brand;
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.brand.findUnique({
      where: { id }
    });

    if (!original) {
      throw new NotFoundException('Brand not found');
    }

    const { id: _, createdAt, updatedAt, ...brandData } = original;

    const duplicate = await this.prisma.brand.create({
      data: {
        ...brandData,
        brandName: `${brandData.brandName} (Copy)`,
        createdBy: userId,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            themeColor: true,
          }
        }
      }
    });

    return duplicate;
  }

  async bulkAction(action: string, ids: string[], userId: string) {
    const validActions = ['delete', 'archive', 'activate'];
    
    if (!validActions.includes(action)) {
      throw new BadRequestException('Invalid bulk action');
    }

    let result;

    switch (action) {
      case 'delete':
        result = await this.prisma.brand.deleteMany({
          where: { id: { in: ids } }
        });
        break;
      case 'archive':
        result = await this.prisma.brand.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ARCHIVED }
        });
        break;
      case 'activate':
        result = await this.prisma.brand.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ACTIVE }
        });
        break;
    }

    // Log activities
    for (const id of ids) {
      await this.prisma.activity.create({
        data: {
          entityType: 'BRAND',
          entityId: id,
          action: action.toUpperCase(),
          description: `Bulk ${action} performed`,
          performedBy: userId,
        }
      });
    }

    return result;
  }

  async getStatistics(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            people: true,
            documents: true,
          }
        },
        documents: true,
      }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const totalBranches = brand.branches.length;
    const totalPeople = brand.branches.reduce((sum, branch) => sum + branch.people.length, 0);
    const totalDocuments = brand.documents.length;
    const activeBranches = brand.branches.filter(b => b.status === Status.ACTIVE).length;

    return {
      totalBranches,
      activeBranches,
      totalPeople,
      totalDocuments,
    };
  }

  async getActivities(id: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          entityType: 'BRAND',
          entityId: id,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      this.prisma.activity.count({
        where: {
          entityType: 'BRAND',
          entityId: id,
        }
      })
    ]);

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}