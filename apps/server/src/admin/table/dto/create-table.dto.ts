import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

