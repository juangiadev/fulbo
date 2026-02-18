import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithUser } from './auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    const bypassEnabled =
      process.env.NODE_ENV !== 'production' &&
      process.env.DEV_AUTH_BYPASS === 'true';

    if (bypassEnabled) {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const headerValue = request.headers['x-dev-auth0-id'];
      const auth0Id = Array.isArray(headerValue) ? headerValue[0] : headerValue;

      if (!auth0Id) {
        return super.canActivate(context);
      }

      request.user = {
        sub: auth0Id,
        email: `${auth0Id}@dev.fulboapp.local`,
        name: 'Dev User',
      } satisfies AuthUser;

      return true;
    }

    return super.canActivate(context);
  }
}
