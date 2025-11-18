import { IsString, IsOptional, IsEnum, IsUUID, IsArray, IsObject } from 'class-validator';
import { Status } from '@prisma/client';

export class CreateBrandDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  brandName: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

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
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  themeColor?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

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
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  themeColor?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class BrandFilterDto {
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
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}