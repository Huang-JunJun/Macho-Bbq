import { Module } from '@nestjs/common';
import { IsTableInStoreConstraint } from '../common/validators/is-table-in-store.validator';
import { AuthModule } from '../auth/auth.module';
import { WsModule } from '../ws/ws.module';
import { MiniStoreController } from './store/store.controller';
import { MiniTableController } from './table/table.controller';
import { MiniMenuController } from './menu/menu.controller';
import { MiniOrderController } from './order/order.controller';
import { MiniFeedbackController } from './feedback/feedback.controller';
import { MiniCartController } from './cart/cart.controller';
import { MiniCartService } from './cart/cart.service';

@Module({
  imports: [AuthModule, WsModule],
  controllers: [MiniStoreController, MiniTableController, MiniMenuController, MiniOrderController, MiniFeedbackController, MiniCartController],
  providers: [IsTableInStoreConstraint, MiniCartService]
})
export class MiniappModule {}
