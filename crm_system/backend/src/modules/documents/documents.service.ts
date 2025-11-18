import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto } from './dto/document.dto';
import { Status } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    const { templateId, ...documentData } = createDocumentDto;

    // If template is used, get template content
    let content = documentData.content;
    if (templateId) {
      const template = await this.prisma.template.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      content = template.content;

      // Update template usage count
      await this.prisma.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });
    }

    const document = await this.prisma.document.create({
      data: {
        ...documentData,
        content,
        templateId,
        version: 1,
        createdBy: userId,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'DOCUMENT',
        entityId: document.id,
        action: 'CREATE',
        description: `Document "${document.name}" created`,
        performedBy: userId,
      }
    });

    return document;
  }

  async findAll(filters: DocumentFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      entityType,
      entityId,
      startDate,
      endDate,
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

    if (status) {
      where.status = status;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (startDate || endDate) {
      where.documentDate = {};
      if (startDate) where.documentDate.gte = new Date(startDate);
      if (endDate) where.documentDate.lte = new Date(endDate);
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              type: true,
            }
          },
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
      this.prisma.document.count({ where })
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            placeholders: true,
          }
        },
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

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, userId: string) {
    const existingDocument = await this.prisma.document.findUnique({
      where: { id }
    });

    if (!existingDocument) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'DOCUMENT',
        entityId: document.id,
        action: 'UPDATE',
        description: `Document "${document.name}" updated`,
        performedBy: userId,
      }
    });

    return document;
  }

  async remove(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.document.delete({
      where: { id }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'DOCUMENT',
        entityId: id,
        action: 'DELETE',
        description: `Document "${document.name}" deleted`,
        performedBy: userId,
      }
    });

    return { message: 'Document deleted successfully' };
  }

  async archive(id: string, userId: string) {
    const document = await this.prisma.document.update({
      where: { id },
      data: { status: Status.ARCHIVED }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'DOCUMENT',
        entityId: id,
        action: 'ARCHIVE',
        description: `Document "${document.name}" archived`,
        performedBy: userId,
      }
    });

    return document;
  }

  async duplicate(id: string, userId: string) {
    const original = await this.prisma.document.findUnique({
      where: { id }
    });

    if (!original) {
      throw new NotFoundException('Document not found');
    }

    const { id: _, createdAt, updatedAt, ...documentData } = original;

    const duplicate = await this.prisma.document.create({
      data: {
        ...documentData,
        name: `${documentData.name} (Copy)`,
        version: 1,
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
        result = await this.prisma.document.deleteMany({
          where: { id: { in: ids } }
        });
        break;
      case 'archive':
        result = await this.prisma.document.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ARCHIVED }
        });
        break;
      case 'activate':
        result = await this.prisma.document.updateMany({
          where: { id: { in: ids } },
          data: { status: Status.ACTIVE }
        });
        break;
    }

    for (const id of ids) {
      await this.prisma.activity.create({
        data: {
          entityType: 'DOCUMENT',
          entityId: id,
          action: action.toUpperCase(),
          description: `Bulk ${action} performed`,
          performedBy: userId,
        }
      });
    }

    return result;
  }

  async createVersion(id: string, userId: string) {
    const original = await this.prisma.document.findUnique({
      where: { id }
    });

    if (!original) {
      throw new NotFoundException('Document not found');
    }

    const newVersion = await this.prisma.document.create({
      data: {
        name: original.name,
        type: original.type,
        documentDate: original.documentDate,
        entityType: original.entityType,
        entityId: original.entityId,
        templateId: original.templateId,
        fileUrl: original.fileUrl,
        fileSize: original.fileSize,
        mimeType: original.mimeType,
        content: original.content,
        metadata: original.metadata,
        status: Status.DRAFT,
        version: original.version + 1,
        createdBy: userId,
      }
    });

    await this.prisma.activity.create({
      data: {
        entityType: 'DOCUMENT',
        entityId: newVersion.id,
        action: 'CREATE_VERSION',
        description: `New version ${newVersion.version} created for document "${original.name}"`,
        performedBy: userId,
      }
    });

    return newVersion;
  }

  async getVersions(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { name: true, entityType: true, entityId: true }
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const versions = await this.prisma.document.findMany({
      where: {
        name: document.name,
        entityType: document.entityType,
        entityId: document.entityId,
      },
      orderBy: { version: 'desc' },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return versions;
  }

  async generateFromTemplate(templateId: string, entityType: string, entityId: string, data: any, userId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Replace placeholders in template content
    let content = template.content;
    
    // Get entity data based on type
    let entityData: any = {};
    switch (entityType) {
      case 'COMPANY':
        entityData = await this.prisma.company.findUnique({ where: { id: entityId } });
        break;
      case 'BRAND':
        entityData = await this.prisma.brand.findUnique({ where: { id: entityId } });
        break;
      case 'BRANCH':
        entityData = await this.prisma.branch.findUnique({ where: { id: entityId } });
        break;
      case 'PERSON':
        entityData = await this.prisma.person.findUnique({ where: { id: entityId } });
        break;
    }

    if (!entityData) {
      throw new NotFoundException('Entity not found');
    }

    // Replace placeholders
    const placeholders = template.placeholders as any || {};
    Object.keys(placeholders).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = entityData[key] || data[key] || '';
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    // Replace system placeholders
    content = content.replace(/{{current_date}}/g, new Date().toLocaleDateString('tr-TR'));
    content = content.replace(/{{current_time}}/g, new Date().toLocaleTimeString('tr-TR'));
    content = content.replace(/{{current_year}}/g, new Date().getFullYear().toString());

    const document = await this.prisma.document.create({
      data: {
        name: data.name || `${template.name} - ${new Date().toLocaleDateString()}`,
        type: template.type,
        documentDate: new Date(),
        entityType: entityType as any,
        entityId,
        templateId,
        content,
        metadata: data,
        status: Status.ACTIVE,
        version: 1,
        createdBy: userId,
      }
    });

    // Update template usage
    await this.prisma.template.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    });

    return document;
  }
}