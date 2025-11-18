import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBranchDto, UpdateBranchDto, BranchFilterDto } from './dto/branch.dto';
import { Status } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto, userId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: createBranchDto.brandId },
      include: { company: true }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const branch = await this.prisma.branch.create({
      data: {
        ...createBranchDto,
        createdBy: userId,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
            themeColor: true,
            company: {
              select: {
                id: true,
                companyName: true,
              }
            }
          }
        },
        _count: {
          select: {
            people: true,
            documents: true,
          }
        }
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'BRANCH',
        entityId: branch.id,
        action: 'CREATE',
        description: `Branch "${branch.branchName}" created`,
        performedBy: userId,
      }
    });

    return branch;
  }

  async findAll(filters: BranchFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      brandId,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { branchName: { contains: search, mode: 'insensitive' } },
        { sgkNumber: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (companyId) {
      where.brand = {
        companyId: companyId
      };
    }

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          brand: {
            select: {
              id: true,
              brandName: true,
              themeColor: true,
              company: {
                select: {
                  id: true,
                  companyName: true,
                }
              }
            }
          },
          _count: {
            select: {
              people: true,
              documents: true,
            }
          }
        }
      }),
      this.prisma.branch.count({ where })
    ]);

    return {
      data: branches,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
            logo: true,
            themeColor: true,
            company: {
              select: {
                id: true,
                companyName: true,
                logo: true,
              }
            }
          }
        },
        people: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            role: true,
            status: true,
            phones: true,
            emails: true,
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
            people: true,
            documents: true,
          }
        }
      }
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto, userId: string) {
    const existingBranch = await this.prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      throw new NotFoundException('Branch not found');
    }

    if (updateBranchDto.brandId && updateBranchDto.brandId !== existingBranch.brandId) {
      const newBrand = await this.prisma.brand.findUnique({
        where: { id: updateBranchDto.brandId }
      });

      if (!newBrand) {
        throw new NotFoundException('Brand not found');
      }
    }

    const branch = await this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
            themeColor: true,
            company: {
              select: {
                id: true,
                companyName: true,
              }
            }
          }
        },
        _count: {
          select: {
            people: true,
            documents: true,
          }
        }
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'BRANCH',
        entityId: branch.id,
        action: 'UPDATE',
        description: `Branch "${branch.branchName}" updated`,
        performedBy: userId,
      }
    });

    return branch;
  }

  async remove(id: string, userId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: { branchName: true }
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    await this.prisma.branch.delete({
      where: { id }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'BRANCH',
        entityId: id,
        action: 'DELETE',
        description: `Branch "${branch.branchName}" deleted`,
        performedBy: userId,
      }
    });

    return { message: 'Branch deleted successfully' };
  }

  async archive(id: string, userId: string) {
    const branch = await this.prisma.branch.update({
      where: { id },
      data: { status: Status.ARCHIVED }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'BRANCH',
        entityId: id,
        action: 'ARCHIVE',
        description: `Branch "${branch.branchName}" archived`,
        performedBy: userId,
      }
    });

    return branch;
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.branch.findUnique({
      where: { id }
    });

    if (!original) {
      throw new NotFoundException('Branch not found');
    }

    const { id: _, createdAt, updatedAt, ...branchData } = original;

    const duplicate = await this.prisma.branch.create({
      data: {
        ...branchData,
        branchName: `${branchData.branchName} (Copy)`,
        createdBy: userId,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
            themeColor: true,
            company: {
              select: {
                id: true,
                companyName: true,
              }
            }
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
        result = await this.prisma.branch.deleteMany({
          where: { id: { in: ids } }
        });
        break;
      case 'archive':
        result = await this.prisma.branch.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ARCHIVED }
        });
        break;
      case 'activate':
        result = await this.prisma.branch.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ACTIVE }
        });
        break;
    }

    for (const id of ids) {
      await this.prisma.activity.create({
        data: {
          entityType: 'BRANCH',
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
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        people: true,
        documents: true,
      }
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const totalPeople = branch.people.length;
    const activePeople = branch.people.filter(p => p.status === Status.ACTIVE).length;
    const totalDocuments = branch.documents.length;

    const roleDistribution = branch.people.reduce((acc, person) => {
      const role = person.role || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPeople,
      activePeople,
      totalDocuments,
      roleDistribution,
    };
  }

  async getActivities(id: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          entityType: 'BRANCH',
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
          entityType: 'BRANCH',
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