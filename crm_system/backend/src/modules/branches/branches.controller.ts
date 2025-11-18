import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto, BranchFilterDto } from './dto/branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  create(@Body() createBranchDto: CreateBranchDto, @Request() req) {
    return this.branchesService.create(createBranchDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: BranchFilterDto) {
    return this.branchesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @Request() req
  ) {
    return this.branchesService.update(id, updateBranchDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.branchesService.remove(id, req.user.userId);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.branchesService.archive(id, req.user.userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.branchesService.duplicate(id, req.user.userId);
  }

  @Post('bulk-action')
  bulkAction(
    @Body() body: { action: string; ids: string[] },
    @Request() req
  ) {
    return this.branchesService.bulkAction(body.action, body.ids, req.user.userId);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id') id: string) {
    return this.branchesService.getStatistics(id);
  }

  @Get(':id/activities')
  getActivities(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.branchesService.getActivities(id, page, limit);
  }
}