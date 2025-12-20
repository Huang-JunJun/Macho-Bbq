import { IsString, MinLength } from 'class-validator';

export class MenuQueryDto {
  @IsString()
  @MinLength(1)
  storeId!: string;
}

