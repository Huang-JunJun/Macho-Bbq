import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min, MinLength } from 'class-validator';

export class StartTableSessionDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  tableId!: string;

  @IsString()
  @IsNotEmpty()
  sign!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  dinersCount!: number;
}
