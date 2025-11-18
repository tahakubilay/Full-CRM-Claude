import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePersonDto, UpdatePersonDto, PersonFilterDto } from './dto/person.dto';
import { Status } from '@prisma/client';

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  async create(createPersonDto: CreatePersonDto, userId: string) {
    const { investments, ...personData } = createPersonDto;

    // Verify branch exists if provided
    if (personData.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: personData.branchId }
      });

      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    // Create person with investments
    const person = await this.prisma.person.create({
      data: {
        ...personData,
        createdBy: userId,
        investments: investments ? {
          create: investments.map(inv => ({
            ...inv,
            investmentDate: new Date(inv.investmentDate),
          }))
        } : undefined
      },
      include: {
        branch: {
          select: {
            id: true,
            branchName: true,
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
        },
        investments: true,
        _count: {
          select: {
            documents: true,
          }
        }
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: person.id,
        action: 'CREATE',
        description: `Person "${person.firstName} ${person.lastName}" created`,
        performedBy: userId,
      }
    });

    return person;
  }

  async findAll(filters: PersonFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      role,
      branchId,
      brandId,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (brandId) {
      where.branch = {
        brandId: brandId
      };
    }

    if (companyId) {
      where.branch = {
        brand: {
          companyId: companyId
        }
      };
    }

    const [people, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: {
            select: {
              id: true,
              branchName: true,
              brand: {
                select: {
                  id: true,
                  brandName: true,
                  company: {
                    select: {
                      id: true,
                      companyName: true,
                    }
                  }
                }
              }
            }
          },
          investments: true,
          _count: {
            select: {
              documents: true,
            }
          }
        }
      }),
      this.prisma.person.count({ where })
    ]);

    return {
      data: people,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            branchName: true,
            brand: {
              select: {
                id: true,
                brandName: true,
                themeColor: true,
                company: {
                  select: {
                    id: true,
                    companyName: true,
                    logo: true,
                  }
                }
              }
            }
          }
        },
        investments: {
          include: {
            _count: true
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
            documents: true,
          }
        }
      }
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async update(id: string, updatePersonDto: UpdatePersonDto, userId: string) {
    const { investments, ...personData } = updatePersonDto;

    const existingPerson = await this.prisma.person.findUnique({
      where: { id },
      include: { investments: true }
    });

    if (!existingPerson) {
      throw new NotFoundException('Person not found');
    }

    if (personData.branchId && personData.branchId !== existingPerson.branchId) {
      const newBranch = await this.prisma.branch.findUnique({
        where: { id: personData.branchId }
      });

      if (!newBranch) {
        throw new NotFoundException('Branch not found');
      }
    }

    // Update person
    const person = await this.prisma.person.update({
      where: { id },
      data: personData,
      include: {
        branch: {
          select: {
            id: true,
            branchName: true,
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
        },
        investments: true,
        _count: {
          select: {
            documents: true,
          }
        }
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: person.id,
        action: 'UPDATE',
        description: `Person "${person.firstName} ${person.lastName}" updated`,
        performedBy: userId,
      }
    });

    return person;
  }

  async remove(id: string, userId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      select: { firstName: true, lastName: true }
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    await this.prisma.person.delete({
      where: { id }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: id,
        action: 'DELETE',
        description: `Person "${person.firstName} ${person.lastName}" deleted`,
        performedBy: userId,
      }
    });

    return { message: 'Person deleted successfully' };
  }

  async archive(id: string, userId: string) {
    const person = await this.prisma.person.update({
      where: { id },
      data: { status: Status.ARCHIVED }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: id,
        action: 'ARCHIVE',
        description: `Person "${person.firstName} ${person.lastName}" archived`,
        performedBy: userId,
      }
    });

    return person;
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.person.findUnique({
      where: { id },
      include: { investments: true }
    });

    if (!original) {
      throw new NotFoundException('Person not found');
    }

    const { id: _, createdAt, updatedAt, investments, ...personData } = original;

    const duplicate = await this.prisma.person.create({
      data: {
        ...personData,
        firstName: `${personData.firstName} (Copy)`,
        nationalId: null, // Clear unique fields
        createdBy: userId,
      },
      include: {
        branch: {
          select: {
            id: true,
            branchName: true,
            brand: {
              select: {
                id: true,
                brandName: true,
                themeColor: true,
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
        result = await this.prisma.person.deleteMany({
          where: { id: { in: ids } }
        });
        break;
      case 'archive':
        result = await this.prisma.person.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ARCHIVED }
        });
        break;
      case 'activate':
        result = await this.prisma.person.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ACTIVE }
        });
        break;
    }

    for (const id of ids) {
      await this.prisma.activity.create({
        data: {
          entityType: 'PERSON',
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
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        investments: true,
        documents: true,
      }
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const totalInvestments = person.investments.length;
    const totalInvestmentAmount = person.investments.reduce(
      (sum, inv) => sum + Number(inv.investmentAmount || 0), 0
    );

    // Calculate total monthly returns
    const totalMonthlyReturn = person.investments.reduce((sum, inv) => {
      const monthlyReturn = Number(inv.investmentAmount || 0) / (inv.amortization || 1);
      return sum + monthlyReturn;
    }, 0);

    // Calculate total returns to date
    const totalReturnToDate = person.investments.reduce((sum, inv) => {
      const monthlyReturn = Number(inv.investmentAmount || 0) / (inv.amortization || 1);
      const monthsElapsed = Math.floor(
        (Date.now() - new Date(inv.investmentDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const cappedMonths = Math.min(monthsElapsed, inv.amortization || 0);
      return sum + (monthlyReturn * cappedMonths);
    }, 0);

    return {
      totalInvestments,
      totalInvestmentAmount,
      totalMonthlyReturn,
      totalReturnToDate,
      totalDocuments: person.documents.length,
    };
  }

  async getActivities(id: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          entityType: 'PERSON',
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
          entityType: 'PERSON',
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

  // Investment Management
  async addInvestment(personId: string, investmentData: any, userId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId }
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const investment = await this.prisma.investment.create({
      data: {
        ...investmentData,
        personId,
        investmentDate: new Date(investmentData.investmentDate),
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: personId,
        action: 'ADD_INVESTMENT',
        description: `Investment added to ${person.firstName} ${person.lastName}`,
        performedBy: userId,
      }
    });

    return investment;
  }

  async updateInvestment(personId: string, investmentId: string, investmentData: any, userId: string) {
    const investment = await this.prisma.investment.findFirst({
      where: { id: investmentId, personId }
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    const updated = await this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        ...investmentData,
        investmentDate: investmentData.investmentDate 
          ? new Date(investmentData.investmentDate) 
          : undefined,
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: personId,
        action: 'UPDATE_INVESTMENT',
        description: `Investment updated`,
        performedBy: userId,
      }
    });

    return updated;
  }

  async removeInvestment(personId: string, investmentId: string, userId: string) {
    const investment = await this.prisma.investment.findFirst({
      where: { id: investmentId, personId }
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    await this.prisma.investment.delete({
      where: { id: investmentId }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'PERSON',
        entityId: personId,
        action: 'DELETE_INVESTMENT',
        description: `Investment deleted`,
        performedBy: userId,
      }
    });

    return { message: 'Investment deleted successfully' };
  }

  async getInvestments(personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true }
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const investments = await this.prisma.investment.findMany({
      where: { personId },
      orderBy: { investmentDate: 'desc' }
    });

    // Calculate returns for each investment
    const investmentsWithCalculations = investments.map(inv => {
      const monthlyReturn = Number(inv.investmentAmount || 0) / (inv.amortization || 1);
      const monthsElapsed = Math.floor(
        (Date.now() - new Date(inv.investmentDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const cappedMonths = Math.min(monthsElapsed, inv.amortization || 0);
      const totalReturn = monthlyReturn * cappedMonths;
      const remainingMonths = Math.max(0, (inv.amortization || 0) - monthsElapsed);

      return {
        ...inv,
        monthlyReturn,
        monthsElapsed: cappedMonths,
        totalReturn,
        remainingMonths,
      };
    });

    return investmentsWithCalculations;
  }
}