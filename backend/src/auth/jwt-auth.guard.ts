import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithUser } from './auth.types';
import { isApiKeyMatch } from './api-key';

const API_KEY_HEADER = 'x-fulbo-api-key';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  override canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const apiKeyHeader = request.headers[API_KEY_HEADER];

    if (apiKeyHeader !== undefined) {
      return this.authenticateWithApiKey(request, apiKeyHeader);
    }

    const bypassEnabled =
      process.env.NODE_ENV !== 'production' &&
      process.env.DEV_AUTH_BYPASS === 'true';

    if (bypassEnabled) {
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

  private authenticateWithApiKey(
    request: RequestWithUser,
    headerValue: string | string[],
  ) {
    const expectedKey = process.env.FULBO_API_KEY;
    const auth0Id = process.env.FULBO_API_KEY_AUTH0_ID;
    const providedKey = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!expectedKey || !auth0Id || !isApiKeyMatch(providedKey, expectedKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.user = { sub: auth0Id } satisfies AuthUser;
    this.logger.log(`API key auth: ${request.method} ${request.path}`);

    return true;
  }
}
