import { Injectable } from '@nestjs/common';

const HEALTH_RESPONSE = {
  status: 'ok',
} as const;

export type HealthResponse = typeof HEALTH_RESPONSE;

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): HealthResponse {
    return HEALTH_RESPONSE;
  }
}
