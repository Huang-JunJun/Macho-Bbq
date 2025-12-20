import { IsEnum, IsOptional } from 'class-validator';

export enum AdminOrderStatusFilter {
  ORDERED = 'ORDERED',
  SETTLED = 'SETTLED'
}

export class AdminOrderListQueryDto {
  @IsOptional()
  @IsEnum(AdminOrderStatusFilter)
  status?: AdminOrderStatusFilter;
}

