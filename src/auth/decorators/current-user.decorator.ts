import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSession } from '../auth.service';

export const CurrentUser = createParamDecorator(
  (data: keyof UserSession | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.session?.user;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
