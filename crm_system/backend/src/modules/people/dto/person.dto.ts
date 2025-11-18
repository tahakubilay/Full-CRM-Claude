import { IsString, IsOptional, IsEnum, IsUUID, IsArray, IsNumber, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from '@prisma/client';

class InvestmentDto {
  @IsEnum(['COMPANY', 'BRAND', 'BRANCH'])
  investmentType: 'COMPANY' | 'BRAND' | 'BRANCH';

  @IsUUID()
  targetId: string;

  @IsDateString()
  investmentDate: string;

  @IsOptional()
  @IsNumber()
  sharePercentage?: number;

  @IsOptional()
  @IsNumber()
  investmentAmount?: number;

  @IsOptional()
  @IsNumber()
  amortization?: number;

  @IsOptional()
  @IsNumber()
  monthlyReturn?: number;
}

export class CreatePersonDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsArray()
  phones?: string[];

  @IsOptional()
  @IsArray()
  emails?: string[];

  @IsOptional()
  @IsArray()
  ibans?: string[];

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  customRole?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvestmentDto)
  investments?: InvestmentDto[];
}

export class UpdatePersonDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsArray()
  phones?: string[];

  @IsOptional()
  @IsArray()
  emails?: string[];

  @IsOptional()
  @IsArray()
  ibans?: string[];

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  customRole?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvestmentDto)
  investments?: InvestmentDto[];
}

export class PersonFilterDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}