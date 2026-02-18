import type { Request } from 'express';

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
}
