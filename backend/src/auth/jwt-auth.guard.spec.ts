import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const TEST_KEY = 'test-key-value';
const TEST_AUTH0_ID = 'auth0|test-user';

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

describe('JwtAuthGuard API key auth', () => {
  const originalEnv = { ...process.env };
  let guard: JwtAuthGuard;
  let parentCanActivate: jest.SpyInstance;

  beforeEach(() => {
    process.env.FULBO_API_KEY = TEST_KEY;
    process.env.FULBO_API_KEY_AUTH0_ID = TEST_AUTH0_ID;
    guard = new JwtAuthGuard();
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

  it('authenticates a valid key as the configured user', () => {
    const { context, request } = buildContext({ 'x-fulbo-api-key': TEST_KEY });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ sub: TEST_AUTH0_ID });
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('works in production', () => {
    process.env.NODE_ENV = 'production';
    const { context } = buildContext({ 'x-fulbo-api-key': TEST_KEY });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a wrong key without falling through to JWT', () => {
    const { context } = buildContext({ 'x-fulbo-api-key': 'wrong' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('rejects a key of a different length without throwing a length error', () => {
    const { context } = buildContext({
      'x-fulbo-api-key': `${TEST_KEY}-longer`,
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects when FULBO_API_KEY is unset', () => {
    delete process.env.FULBO_API_KEY;
    const { context } = buildContext({ 'x-fulbo-api-key': TEST_KEY });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects when FULBO_API_KEY_AUTH0_ID is unset', () => {
    delete process.env.FULBO_API_KEY_AUTH0_ID;
    const { context } = buildContext({ 'x-fulbo-api-key': TEST_KEY });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('falls through to the JWT path when no key header is sent', () => {
    const { context } = buildContext({});

    expect(guard.canActivate(context)).toBe('jwt-path');
    expect(parentCanActivate).toHaveBeenCalledWith(context);
  });
});
