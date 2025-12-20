import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsString()
  @MinLength(1)
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isOnSale?: boolean;

  @IsOptional()
  @IsBoolean()
  isSoldOut?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

