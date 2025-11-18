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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateFilterDto } from './dto/template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto, @Request() req) {
    return this.templatesService.create(createTemplateDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: TemplateFilterDto) {
    return this.templatesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @Request() req
  ) {
    return this.templatesService.update(id, updateTemplateDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.templatesService.remove(id, req.user.userId);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.templatesService.archive(id, req.user.userId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @Request() req) {
    return this.templatesService.activate(id, req.user.userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.templatesService.duplicate(id, req.user.userId);
  }

  @Post('bulk-action')
  bulkAction(
    @Body() body: { action: string; ids: string[] },
    @Request() req
  ) {
    return this.templatesService.bulkAction(body.action, body.ids, req.user.userId);
  }

  @Get(':id/usage')
  getUsageStatistics(@Param('id') id: string) {
    return this.templatesService.getUsageStatistics(id);
  }

  @Post(':id/preview')
  preview(@Param('id') id: string, @Body() body: { sampleData?: any }) {
    return this.templatesService.preview(id, body.sampleData);
  }

  @Get(':id/export')
  export(@Param('id') id: string) {
    return this.templatesService.export(id);
  }

  @Post('import')
  import(@Body() templateData: any, @Request() req) {
    return this.templatesService.import(templateData, req.user.userId);
  }
}