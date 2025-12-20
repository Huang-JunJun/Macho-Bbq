import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminJwtUser } from './jwt.strategy';

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as AdminJwtUser | undefined;
});

