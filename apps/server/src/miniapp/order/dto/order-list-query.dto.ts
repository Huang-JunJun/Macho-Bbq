import { IsString, MinLength } from 'class-validator';

export class OrderListQueryDto {
  @IsString()
  @MinLength(1)
  sessionId!: string;
}

