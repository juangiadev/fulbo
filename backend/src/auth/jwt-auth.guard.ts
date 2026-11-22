import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithUser } from './auth.types';
import { isApiKeyMatch } from './api-key';

const API_KEY_HEADER = 'x-fulbo-api-key';
const USER_ID_HEADER = 'x-fulbo-user-id';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  // DataSource comes from the global TypeOrmCoreModule, so every module that
  // uses this guard can resolve it without importing anything extra.
  constructor(private readonly dataSource: DataSource) {
    super();
  }

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

  private async authenticateWithApiKey(
    request: RequestWithUser,
    apiKeyHeaderValue: string | string[],
  ) {
    const expectedKey = process.env.FULBO_API_KEY;
    const providedKey = firstHeaderValue(apiKeyHeaderValue) ?? '';

    if (!expectedKey || !isApiKeyMatch(providedKey, expectedKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    const impersonatedUser = await this.findImpersonatedUser(
      firstHeaderValue(request.headers[USER_ID_HEADER]),
    );

    request.user = {
      sub: impersonatedUser.auth0Id,
      email: impersonatedUser.email,
      name: impersonatedUser.name,
    } satisfies AuthUser;
    this.logger.log(
      `API key auth: ${request.method} ${request.path} as user ${impersonatedUser.id}`,
    );

    return true;
  }

  private async findImpersonatedUser(userId: string | undefined) {
    if (!userId || !isUUID(userId)) {
      throw new UnauthorizedException(
        `Header ${USER_ID_HEADER} must be a valid user id`,
      );
    }

    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Unknown user');
    }

    return user;
  }
}

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
