import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CartSetQtyDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  tableId!: string;

  @IsString()
  @MinLength(1)
  sessionId!: string;

  @IsString()
  @MinLength(1)
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  qty!: number;
}
