import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Auth0ManagementTokenResponse {
  access_token: string;
  expires_in: number;
}

interface Auth0UserProfile {
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
}

@Injectable()
export class Auth0ManagementService {
  private readonly logger = new Logger(Auth0ManagementService.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getUserProfile(userId: string): Promise<Auth0UserProfile | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return null;
    }

    const issuer = this.getIssuerBaseUrl();
    if (!issuer) {
      return null;
    }

    const endpoint = `${issuer}api/v2/users/${encodeURIComponent(userId)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const responseText = await response.text();
      this.logger.warn(
        `Auth0 management user lookup failed (${response.status}): ${responseText}`,
      );
      return null;
    }

    const profile = (await response.json()) as Auth0UserProfile;
    return profile;
  }

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.value;
    }

    const issuer = this.getIssuerBaseUrl();
    const clientId = this.configService.get<string>('AUTH0_MGMT_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'AUTH0_MGMT_CLIENT_SECRET',
    );

    if (!issuer || !clientId || !clientSecret) {
      return null;
    }

    const response = await fetch(`${issuer}oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: `${issuer}api/v2/`,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      this.logger.warn(
        `Auth0 management token request failed (${response.status}): ${responseText}`,
      );
      return null;
    }

    const body = (await response.json()) as Auth0ManagementTokenResponse;
    this.cachedToken = {
      value: body.access_token,
      expiresAt: now + body.expires_in * 1000,
    };

    return this.cachedToken.value;
  }

  private getIssuerBaseUrl(): string | null {
    const rawIssuer = this.configService.get<string>('AUTH0_ISSUER_URL') ?? '';
    const normalized = rawIssuer.trim();
    if (!normalized) {
      return null;
    }

    return normalized.endsWith('/') ? normalized : `${normalized}/`;
  }
}
