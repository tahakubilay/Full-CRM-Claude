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
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto, BrandFilterDto } from './dto/brand.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('brands')
@UseGuards(JwtAuthGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  create(@Body() createBrandDto: CreateBrandDto, @Request() req) {
    return this.brandsService.create(createBrandDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: BrandFilterDto) {
    return this.brandsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @Request() req
  ) {
    return this.brandsService.update(id, updateBrandDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.brandsService.remove(id, req.user.userId);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.brandsService.archive(id, req.user.userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.brandsService.duplicate(id, req.user.userId);
  }

  @Post('bulk-action')
  bulkAction(
    @Body() body: { action: string; ids: string[] },
    @Request() req
  ) {
    return this.brandsService.bulkAction(body.action, body.ids, req.user.userId);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id') id: string) {
    return this.brandsService.getStatistics(id);
  }

  @Get(':id/activities')
  getActivities(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.brandsService.getActivities(id, page, limit);
  }
}