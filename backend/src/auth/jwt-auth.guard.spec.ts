import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';

const TEST_KEY = 'test-key-value';
const KNOWN_USER = {
  id: '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69',
  auth0Id: 'auth0|test-user',
  email: 'test-user@example.com',
  name: 'Test User',
};
const UNKNOWN_USER_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

function buildContext(headers: Record<string, string | string[]>) {
  const request: Record<string, unknown> = {
    headers,
    method: 'GET',
    path: '/api/tournaments',
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function apiKeyHeaders(userId?: string) {
  return {
    'x-fulbo-api-key': TEST_KEY,
    ...(userId === undefined ? {} : { 'x-fulbo-user-id': userId }),
  };
}

describe('JwtAuthGuard API key auth', () => {
  const originalEnv = { ...process.env };
  let guard: JwtAuthGuard;
  let parentCanActivate: jest.SpyInstance;
  let findUser: jest.Mock;

  beforeEach(() => {
    process.env.FULBO_API_KEY = TEST_KEY;
    findUser = jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === KNOWN_USER.id ? KNOWN_USER : null),
    );
    const dataSource = {
      getRepository: () => ({ findOne: findUser }),
    } as unknown as DataSource;
    guard = new JwtAuthGuard(dataSource);
    const parentPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: ExecutionContext) => unknown;
    };
    parentCanActivate = jest
      .spyOn(parentPrototype, 'canActivate')
      .mockReturnValue('jwt-path');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('acts as the user named by x-fulbo-user-id when the key is valid', async () => {
    const { context, request } = buildContext(apiKeyHeaders(KNOWN_USER.id));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: KNOWN_USER.auth0Id,
      email: KNOWN_USER.email,
      name: KNOWN_USER.name,
    });
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('works in production', async () => {
    process.env.NODE_ENV = 'production';
    const { context } = buildContext(apiKeyHeaders(KNOWN_USER.id));

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a valid key without x-fulbo-user-id', async () => {
    const { context } = buildContext(apiKeyHeaders());

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findUser).not.toHaveBeenCalled();
  });

  it('rejects a valid key with a malformed user id without querying the database', async () => {
    const { context } = buildContext(apiKeyHeaders('not-a-uuid'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findUser).not.toHaveBeenCalled();
  });

  it('rejects a valid key with an unknown user id', async () => {
    const { context } = buildContext(apiKeyHeaders(UNKNOWN_USER_ID));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong key without looking up the user or falling through to JWT', async () => {
    const { context } = buildContext({
      'x-fulbo-api-key': 'wrong',
      'x-fulbo-user-id': KNOWN_USER.id,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findUser).not.toHaveBeenCalled();
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('rejects a key of a different length without throwing a length error', async () => {
    const { context } = buildContext({
      'x-fulbo-api-key': `${TEST_KEY}-longer`,
      'x-fulbo-user-id': KNOWN_USER.id,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when FULBO_API_KEY is unset', async () => {
    delete process.env.FULBO_API_KEY;
    const { context } = buildContext(apiKeyHeaders(KNOWN_USER.id));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ignores x-fulbo-user-id when no key header is sent', () => {
    const { context, request } = buildContext({
      'x-fulbo-user-id': KNOWN_USER.id,
    });

    expect(guard.canActivate(context)).toBe('jwt-path');
    expect(parentCanActivate).toHaveBeenCalledWith(context);
    expect(findUser).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });
});
