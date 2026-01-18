import { IsIn, IsInt, Min } from 'class-validator';

export class SessionDiscountDto {
  @IsIn(['PERCENT', 'AMOUNT'])
  type!: 'PERCENT' | 'AMOUNT';

  @IsInt()
  @Min(0)
  value!: number;
}
