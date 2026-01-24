import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class StartTableSessionDto {
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
  @IsNotEmpty()
  sign!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  dinersCount!: number;
}
