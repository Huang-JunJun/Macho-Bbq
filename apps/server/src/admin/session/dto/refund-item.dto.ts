import { IsInt, IsString, Min } from 'class-validator';

export class RefundItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}
