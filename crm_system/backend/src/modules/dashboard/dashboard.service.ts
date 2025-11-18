import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Status } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatistics(userId: string) {
    const [
      totalCompanies,
      activeCompanies,
      totalBrands,
      activeBrands,
      totalBranches,
      activeBranches,
      totalPeople,
      activePeople,
      totalInvestors,
      totalDocuments,
      totalTemplates,
      recentActivities
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: Status.ACTIVE } }),
      this.prisma.brand.count(),
      this.prisma.brand.count({ where: { status: Status.ACTIVE } }),
      this.prisma.branch.count(),
      this.prisma.branch.count({ where: { status: Status.ACTIVE } }),
      this.prisma.person.count(),
      this.prisma.person.count({ where: { status: Status.ACTIVE } }),
      this.prisma.person.count({ where: { role: 'Investor' } }),
      this.prisma.document.count(),
      this.prisma.template.count({ where: { isActive: true } }),
      this.prisma.activity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      })
    ]);

    // Calculate growth percentages (mock data for now)
    const companyGrowth = await this.calculateGrowth('company');
    const brandGrowth = await this.calculateGrowth('brand');
    const branchGrowth = await this.calculateGrowth('branch');
    const peopleGrowth = await this.calculateGrowth('person');

    return {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        growth: companyGrowth
      },
      brands: {
        total: totalBrands,
        active: activeBrands,
        growth: brandGrowth
      },
      branches: {
        total: totalBranches,
        active: activeBranches,
        growth: branchGrowth
      },
      people: {
        total: totalPeople,
        active: activePeople,
        growth: peopleGrowth
      },
      investors: {
        total: totalInvestors
      },
      documents: {
        total: totalDocuments
      },
      templates: {
        total: totalTemplates
      },
      recentActivities
    };
  }

  async getRecentActivities(limit = 10) {
    const activities = await this.prisma.activity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return activities;
  }

  async getUpcomingEvents(limit = 5) {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        startDate: {
          gte: new Date(),
        }
      },
      take: limit,
      orderBy: { startDate: 'asc' },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return events;
  }

  async getInvestmentSummary() {
    const investments = await this.prisma.investment.findMany({
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    const totalInvestments = investments.length;
    const totalInvestmentAmount = investments.reduce(
      (sum, inv) => sum + Number(inv.investmentAmount || 0),
      0
    );

    const totalMonthlyReturn = investments.reduce((sum, inv) => {
      const monthlyReturn = Number(inv.investmentAmount || 0) / (inv.amortization || 1);
      return sum + monthlyReturn;
    }, 0);

    const totalReturnToDate = investments.reduce((sum, inv) => {
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
      recentInvestments: investments.slice(0, 5)
    };
  }

  async getChartData() {
    // Entity distribution
    const entityDistribution = await Promise.all([
      this.prisma.company.count(),
      this.prisma.brand.count(),
      this.prisma.branch.count(),
      this.prisma.person.count(),
    ]);

    // Monthly growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.getMonthlyGrowthData(sixMonthsAgo);

    // Status distribution
    const statusDistribution = await Promise.all([
      this.prisma.company.count({ where: { status: Status.ACTIVE } }),
      this.prisma.company.count({ where: { status: Status.DRAFT } }),
      this.prisma.company.count({ where: { status: Status.ARCHIVED } }),
    ]);

    // Document types distribution
    const documentTypes = await this.prisma.document.groupBy({
      by: ['type'],
      _count: true,
      take: 10
    });

    return {
      entityDistribution: {
        labels: ['Companies', 'Brands', 'Branches', 'People'],
        data: entityDistribution
      },
      monthlyGrowth: monthlyData,
      statusDistribution: {
        labels: ['Active', 'Draft', 'Archived'],
        data: statusDistribution
      },
      documentTypes: {
        labels: documentTypes.map(d => d.type || 'Other'),
        data: documentTypes.map(d => d._count)
      }
    };
  }

  async getWidgets() {
    const [
      pendingDocuments,
      activeTemplates,
      recentDocuments,
      upcomingEvents
    ] = await Promise.all([
      this.prisma.document.count({ where: { status: Status.DRAFT } }),
      this.prisma.template.count({ where: { isActive: true } }),
      this.prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          startDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        },
        take: 5,
        orderBy: { startDate: 'asc' }
      })
    ]);

    return {
      pendingDocuments,
      activeTemplates,
      recentDocuments,
      upcomingEvents
    };
  }

  private async calculateGrowth(entity: 'company' | 'brand' | 'branch' | 'person'): Promise<number> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let lastMonthCount = 0;
    let currentMonthCount = 0;

    switch (entity) {
      case 'company':
        lastMonthCount = await this.prisma.company.count({
          where: { createdAt: { gte: lastMonth, lt: currentMonth } }
        });
        currentMonthCount = await this.prisma.company.count({
          where: { createdAt: { gte: currentMonth } }
        });
        break;
      case 'brand':
        lastMonthCount = await this.prisma.brand.count({
          where: { createdAt: { gte: lastMonth, lt: currentMonth } }
        });
        currentMonthCount = await this.prisma.brand.count({
          where: { createdAt: { gte: currentMonth } }
        });
        break;
      case 'branch':
        lastMonthCount = await this.prisma.branch.count({
          where: { createdAt: { gte: lastMonth, lt: currentMonth } }
        });
        currentMonthCount = await this.prisma.branch.count({
          where: { createdAt: { gte: currentMonth } }
        });
        break;
      case 'person':
        lastMonthCount = await this.prisma.person.count({
          where: { createdAt: { gte: lastMonth, lt: currentMonth } }
        });
        currentMonthCount = await this.prisma.person.count({
          where: { createdAt: { gte: currentMonth } }
        });
        break;
    }

    if (lastMonthCount === 0) return currentMonthCount > 0 ? 100 : 0;
    return ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
  }

  private async getMonthlyGrowthData(startDate: Date) {
    const months: string[] = [];
    const companiesData: number[] = [];
    const brandsData: number[] = [];
    const branchesData: number[] = [];
    const peopleData: number[] = [];

    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(startDate);
      monthStart.setMonth(monthStart.getMonth() + i);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      months.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));

      const [companies, brands, branches, people] = await Promise.all([
        this.prisma.company.count({
          where: { createdAt: { gte: monthStart, lt: monthEnd } }
        }),
        this.prisma.brand.count({
          where: { createdAt: { gte: monthStart, lt: monthEnd } }
        }),
        this.prisma.branch.count({
          where: { createdAt: { gte: monthStart, lt: monthEnd } }
        }),
        this.prisma.person.count({
          where: { createdAt: { gte: monthStart, lt: monthEnd } }
        }),
      ]);

      companiesData.push(companies);
      brandsData.push(brands);
      branchesData.push(branches);
      peopleData.push(people);
    }

    return {
      labels: months,
      datasets: [
        { label: 'Companies', data: companiesData },
        { label: 'Brands', data: brandsData },
        { label: 'Branches', data: branchesData },
        { label: 'People', data: peopleData }
      ]
    };
  }
}