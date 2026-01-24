import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResolveTableDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  tableId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  tableCode?: string;

  @IsString()
  @MinLength(1)
  sign!: string;
}
