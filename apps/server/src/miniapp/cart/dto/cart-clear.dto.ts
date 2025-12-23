import { IsString, MinLength } from 'class-validator';

export class CartClearDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  tableId!: string;

  @IsString()
  @MinLength(1)
  sessionId!: string;
}
