import { IsString, MinLength } from 'class-validator';
import { IsTableInStore } from '../../../common/validators/is-table-in-store.validator';

export class OrderListQueryDto {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  @IsTableInStore()
  tableId!: string;
}
