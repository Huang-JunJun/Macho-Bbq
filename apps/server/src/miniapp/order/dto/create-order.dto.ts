import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator';
import { SpiceLevel } from '../../../common/enums';
import { IsTableInStore } from '../../../common/validators/is-table-in-store.validator';

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

  @IsEnum(SpiceLevel)
  spiceLevel!: SpiceLevel;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

