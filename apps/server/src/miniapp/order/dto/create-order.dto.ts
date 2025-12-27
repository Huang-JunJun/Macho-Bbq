import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
  ValidateIf
} from 'class-validator';
import { IsTableInStore } from '../../../common/validators/is-table-in-store.validator';

export enum OrderChannel {
  DINE_IN = 'DINE_IN',
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY'
}

export class CreateOrderItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  @IsTableInStore()
  tableId!: string;

  @IsString()
  @MinLength(1)
  sessionId!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Max(20)
  dinersCount!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  spiceKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  spiceLevel?: string;

  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  @IsOptional()
  @IsString()
  remark?: string;

  @ValidateIf((o) => o.items !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
