import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateFilterDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createTemplateDto: CreateTemplateDto, userId: string) {
    const template = await this.prisma.template.create({
      data: {
        ...createTemplateDto,
        version: 1,
        usageCount: 0,
        createdBy: userId,
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'TEMPLATE',
        entityId: template.id,
        action: 'CREATE',
        description: `Template "${template.name}" created`,
        performedBy: userId,
      }
    });

    return template;
  }

  async findAll(filters: TemplateFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      category,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      this.prisma.template.count({ where })
    ]);

    return {
      data: templates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto, userId: string) {
    const existingTemplate = await this.prisma.template.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      throw new NotFoundException('Template not found');
    }

    const template = await this.prisma.template.update({
      where: { id },
      data: {
        ...updateTemplateDto,
        version: existingTemplate.version + 1,
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'TEMPLATE',
        entityId: template.id,
        action: 'UPDATE',
        description: `Template "${template.name}" updated to version ${template.version}`,
        performedBy: userId,
      }
    });

    return template;
  }

  async remove(id: string, userId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if template is being used
    const documentsUsingTemplate = await this.prisma.document.count({
      where: { templateId: id }
    });

    if (documentsUsingTemplate > 0) {
      throw new BadRequestException(
        `Cannot delete template. It is being used by ${documentsUsingTemplate} document(s)`
      );
    }

    await this.prisma.template.delete({
      where: { id }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'TEMPLATE',
        entityId: id,
        action: 'DELETE',
        description: `Template "${template.name}" deleted`,
        performedBy: userId,
      }
    });

    return { message: 'Template deleted successfully' };
  }

  async archive(id: string, userId: string) {
    const template = await this.prisma.template.update({
      where: { id },
      data: { isActive: false }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'TEMPLATE',
        entityId: id,
        action: 'ARCHIVE',
        description: `Template "${template.name}" archived`,
        performedBy: userId,
      }
    });

    return template;
  }

  async activate(id: string, userId: string) {
    const template = await this.prisma.template.update({
      where: { id },
      data: { isActive: true }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'TEMPLATE',
        entityId: id,
        action: 'ACTIVATE',
        description: `Template "${template.name}" activated`,
        performedBy: userId,
      }
    });

    return template;
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.template.findUnique({
      where: { id }
    });

    if (!original) {
      throw new NotFoundException('Template not found');
    }

    const { id: _, createdAt, updatedAt, usageCount, ...templateData } = original;

    const duplicate = await this.prisma.template.create({
      data: {
        ...templateData,
        name: `${templateData.name} (Copy)`,
        version: 1,
        usageCount: 0,
        createdBy: userId,
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
        // Check if any template is being used
        const inUseCount = await this.prisma.document.count({
          where: { templateId: { in: ids } }
        });

        if (inUseCount > 0) {
          throw new BadRequestException(
            'Cannot delete templates that are being used by documents'
          );
        }

        result = await this.prisma.template.deleteMany({
          where: { id: { in: ids } }
        });
        break;
      case 'archive':
        result = await this.prisma.template.updateMany({
          where: { id: { in: ids } },
          data: { isActive: false }
        });
        break;
      case 'activate':
        result = await this.prisma.template.updateMany({
          where: { id: { in: ids } },
          data: { isActive: true }
        });
        break;
    }

    for (const id of ids) {
      await this.prisma.activity.create({
        data: {
          entityType: 'TEMPLATE',
          entityId: id,
          action: action.toUpperCase(),
          description: `Bulk ${action} performed`,
          performedBy: userId,
        }
      });
    }

    return result;
  }

  async getUsageStatistics(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: { name: true, usageCount: true }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const documentsCreated = await this.prisma.document.count({
      where: { templateId: id }
    });

    const recentDocuments = await this.prisma.document.findMany({
      where: { templateId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        entityType: true,
      }
    });

    return {
      templateName: template.name,
      usageCount: template.usageCount,
      documentsCreated,
      recentDocuments,
    };
  }

  async preview(id: string, sampleData?: any) {
    const template = await this.prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    let previewContent = template.content;

    // Replace placeholders with sample data
    if (sampleData) {
      Object.keys(sampleData).forEach(key => {
        const placeholder = `{{${key}}}`;
        previewContent = previewContent.replace(new RegExp(placeholder, 'g'), sampleData[key]);
      });
    }

    // Replace system placeholders
    previewContent = previewContent.replace(/{{current_date}}/g, new Date().toLocaleDateString('tr-TR'));
    previewContent = previewContent.replace(/{{current_time}}/g, new Date().toLocaleTimeString('tr-TR'));
    previewContent = previewContent.replace(/{{current_year}}/g, new Date().getFullYear().toString());

    return {
      original: template.content,
      preview: previewContent,
      placeholders: template.placeholders,
    };
  }

  async export(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const { id: _, createdAt, updatedAt, createdBy, usageCount, ...exportData } = template;

    return exportData;
  }

  async import(templateData: any, userId: string) {
    const template = await this.prisma.template.create({
      data: {
        ...templateData,
        version: 1,
        usageCount: 0,
        createdBy: userId,
      }
    });

    return template;
  }
}