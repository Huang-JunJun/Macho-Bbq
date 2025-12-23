import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export enum AdminSessionStatusFilter {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED'
}

export class AdminOrderListQueryDto {
  @IsOptional()
  @IsEnum(AdminSessionStatusFilter)
  status?: AdminSessionStatusFilter;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;
}
