import { IsString, MinLength } from 'class-validator';

export class ResolveTableDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  tableId!: string;

  @IsString()
  @MinLength(1)
  sign!: string;
}

