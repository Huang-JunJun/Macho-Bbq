import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  address?: string;
}

