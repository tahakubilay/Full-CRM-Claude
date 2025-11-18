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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto } from './dto/document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() createDocumentDto: CreateDocumentDto, @Request() req) {
    return this.documentsService.create(createDocumentDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: DocumentFilterDto) {
    return this.documentsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req
  ) {
    return this.documentsService.update(id, updateDocumentDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.userId);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.documentsService.archive(id, req.user.userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.documentsService.duplicate(id, req.user.userId);
  }

  @Post('bulk-action')
  bulkAction(
    @Body() body: { action: string; ids: string[] },
    @Request() req
  ) {
    return this.documentsService.bulkAction(body.action, body.ids, req.user.userId);
  }

  @Post(':id/versions')
  createVersion(@Param('id') id: string, @Request() req) {
    return this.documentsService.createVersion(id, req.user.userId);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.documentsService.getVersions(id);
  }

  @Post('generate-from-template')
  generateFromTemplate(
    @Body() body: { templateId: string; entityType: string; entityId: string; data: any },
    @Request() req
  ) {
    return this.documentsService.generateFromTemplate(
      body.templateId,
      body.entityType,
      body.entityId,
      body.data,
      req.user.userId
    );
  }
}