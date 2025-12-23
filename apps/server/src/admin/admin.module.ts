import { Module } from '@nestjs/common';
import { IsTableInStoreConstraint } from '../common/validators/is-table-in-store.validator';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminStoreController } from './store/admin-store.controller';
import { AdminTableController } from './table/admin-table.controller';
import { AdminCategoryController } from './category/admin-category.controller';
import { AdminProductController } from './product/admin-product.controller';
import { AdminUploadController } from './upload/admin-upload.controller';
import { AdminOrderController } from './order/admin-order.controller';
import { AdminFeedbackController } from './feedback/admin-feedback.controller';
import { AdminSessionController } from './session/admin-session.controller';
import { AdminSessionService } from './session/admin-session.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminAuthController,
    AdminStoreController,
    AdminTableController,
    AdminCategoryController,
    AdminProductController,
    AdminUploadController,
    AdminOrderController,
    AdminFeedbackController,
    AdminSessionController
  ],
  providers: [IsTableInStoreConstraint, AdminSessionService]
})
export class AdminModule {}
