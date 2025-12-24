import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

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
  @IsObject()
  spiceLabels?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  autoPrintReceiptOnSettle?: boolean;
}
