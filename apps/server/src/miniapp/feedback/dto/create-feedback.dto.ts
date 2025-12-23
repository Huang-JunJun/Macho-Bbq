import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum FeedbackTypeDto {
  DISH = 'DISH',
  SERVICE = 'SERVICE',
  ENV = 'ENV',
  OTHER = 'OTHER'
}

export class CreateFeedbackDto {
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
  @MaxLength(50)
  contact?: string;

  @IsEnum(FeedbackTypeDto)
  type!: FeedbackTypeDto;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

