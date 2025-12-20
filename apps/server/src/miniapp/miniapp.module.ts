import { Module } from '@nestjs/common';
import { IsTableInStoreConstraint } from '../common/validators/is-table-in-store.validator';
import { MiniStoreController } from './store/store.controller';
import { MiniTableController } from './table/table.controller';
import { MiniMenuController } from './menu/menu.controller';
import { MiniOrderController } from './order/order.controller';

@Module({
  controllers: [MiniStoreController, MiniTableController, MiniMenuController, MiniOrderController],
  providers: [IsTableInStoreConstraint]
})
export class MiniappModule {}

