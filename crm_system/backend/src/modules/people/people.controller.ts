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
import { PeopleService } from './people.service';
import { CreatePersonDto, UpdatePersonDto, PersonFilterDto } from './dto/person.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  create(@Body() createPersonDto: CreatePersonDto, @Request() req) {
    return this.peopleService.create(createPersonDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: PersonFilterDto) {
    return this.peopleService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.peopleService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePersonDto: UpdatePersonDto,
    @Request() req
  ) {
    return this.peopleService.update(id, updatePersonDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.peopleService.remove(id, req.user.userId);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    return this.peopleService.archive(id, req.user.userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.peopleService.duplicate(id, req.user.userId);
  }

  @Post('bulk-action')
  bulkAction(
    @Body() body: { action: string; ids: string[] },
    @Request() req
  ) {
    return this.peopleService.bulkAction(body.action, body.ids, req.user.userId);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id') id: string) {
    return this.peopleService.getStatistics(id);
  }

  @Get(':id/activities')
  getActivities(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.peopleService.getActivities(id, page, limit);
  }

  // Investment endpoints
  @Get(':id/investments')
  getInvestments(@Param('id') id: string) {
    return this.peopleService.getInvestments(id);
  }

  @Post(':id/investments')
  addInvestment(
    @Param('id') id: string,
    @Body() investmentData: any,
    @Request() req
  ) {
    return this.peopleService.addInvestment(id, investmentData, req.user.userId);
  }

  @Patch(':id/investments/:investmentId')
  updateInvestment(
    @Param('id') id: string,
    @Param('investmentId') investmentId: string,
    @Body() investmentData: any,
    @Request() req
  ) {
    return this.peopleService.updateInvestment(id, investmentId, investmentData, req.user.userId);
  }

  @Delete(':id/investments/:investmentId')
  removeInvestment(
    @Param('id') id: string,
    @Param('investmentId') investmentId: string,
    @Request() req
  ) {
    return this.peopleService.removeInvestment(id, investmentId, req.user.userId);
  }
}