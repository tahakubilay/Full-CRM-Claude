import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  getStatistics(@Request() req) {
    return this.dashboardService.getStatistics(req.user.userId);
  }

  @Get('recent-activities')
  getRecentActivities() {
    return this.dashboardService.getRecentActivities();
  }

  @Get('upcoming-events')
  getUpcomingEvents() {
    return this.dashboardService.getUpcomingEvents();
  }

  @Get('investment-summary')
  getInvestmentSummary() {
    return this.dashboardService.getInvestmentSummary();
  }

  @Get('chart-data')
  getChartData() {
    return this.dashboardService.getChartData();
  }

  @Get('widgets')
  getWidgets() {
    return this.dashboardService.getWidgets();
  }
}