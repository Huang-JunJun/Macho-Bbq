import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  businessHours?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @IsArray()
  spiceOptions?: Array<{ key: string; label: string; sort: number; enabled: boolean }>;

  @IsOptional()
  @IsBoolean()
  autoPrintReceiptOnSettle?: boolean;
}
