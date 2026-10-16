import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';
import { Role } from '@prisma/client';

export interface UserSession {
  id: string;
  ssoId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly ssoBaseUrl = (process.env.SSO_BASE_URL || 'https://sso-a.oussamma.tn').replace(/\/$/, '');
  private readonly clientId = process.env.SSO_CLIENT_ID || 'client_tv_app';
  private readonly clientSecret = process.env.SSO_CLIENT_SECRET || 'sec_tv_platform_secret_2026';
  private readonly appUrl = (process.env.APP_URL || 'https://tv.oussamma.tn').replace(/\/$/, '');
  private readonly redirectUri = process.env.SSO_REDIRECT_URI || `${this.appUrl}/auth/callback`;
  private readonly scopes = process.env.SSO_SCOPES || 'openid profile email';

  private readonly pkceCache = new Map<string, { verifier: string; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  savePkceVerifier(state: string, verifier: string) {
    this.cleanExpiredPkce();
    this.pkceCache.set(state, { verifier, expiresAt: Date.now() + 15 * 60 * 1000 });
  }

  getPkceVerifier(state: string): string | undefined {
    const entry = this.pkceCache.get(state);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.pkceCache.delete(state);
      return undefined;
    }
    this.pkceCache.delete(state);
    return entry.verifier;
  }

  private cleanExpiredPkce() {
    const now = Date.now();
    for (const [key, value] of this.pkceCache.entries()) {
      if (now > value.expiresAt) {
        this.pkceCache.delete(key);
      }
    }
  }

  generatePkcePair() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');
    return { codeVerifier, codeChallenge, state };
  }

  getAuthorizationUrl(codeChallenge: string, state: string): string {
    const authEndpoint = `${this.ssoBaseUrl}/oauth/authorize`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${authEndpoint}?${params.toString()}`;
  }

  getLogoutUrl(): string {
    return `${this.ssoBaseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(this.appUrl)}`;
  }

  async handleCallback(code: string, codeVerifier?: string): Promise<UserSession> {
    const tokenEndpoint = `${this.ssoBaseUrl}/oauth/token`;
    const userinfoEndpoint = `${this.ssoBaseUrl}/oauth/userinfo`;

    try {
      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('code', code);
      tokenParams.append('redirect_uri', this.redirectUri);
      tokenParams.append('client_id', this.clientId);
      tokenParams.append('client_secret', this.clientSecret);
      if (codeVerifier) {
        tokenParams.append('code_verifier', codeVerifier);
      }

      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const tokenResponse = await axios.post(tokenEndpoint, tokenParams.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
        timeout: 10000,
      });

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        throw new UnauthorizedException('Jeton d\'accès non retourné par le SSO.');
      }

      const userinfoResponse = await axios.get(userinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      const ssoUser = userinfoResponse.data;
      const ssoId = String(ssoUser.sub || ssoUser.id);
      const email = String(ssoUser.email || `${ssoId}@sso.local`).toLowerCase();
      const name = ssoUser.name || ssoUser.preferred_username || email.split('@')[0];
      const avatarUrl = ssoUser.picture || ssoUser.avatar_url || null;

      // Détection automatique du rôle administrateur
      const adminEmails = (process.env.ADMIN_EMAILS || 'oussammabenhassine@gmail.com')
        .toLowerCase()
        .split(',')
        .map((e) => e.trim());
      const ssoRoles = Array.isArray(ssoUser.roles) ? ssoUser.roles : [];
      const isAdmin =
        adminEmails.includes(email) ||
        ssoRoles.includes('admin') ||
        ssoRoles.includes('super_admin');

      const role: Role = isAdmin ? Role.ADMIN : Role.USER;

      // Upsert utilisateur local
      const user = await this.prisma.user.upsert({
        where: { ssoId },
        update: {
          email,
          name,
          avatarUrl,
          role,
        },
        create: {
          ssoId,
          email,
          name,
          avatarUrl,
          role,
          preferences: {
            create: {
              volume: 80,
              muted: false,
              theme: 'dark',
            },
          },
        },
        include: {
          preferences: true,
        },
      });

      return {
        id: user.id,
        ssoId: user.ssoId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        role: user.role,
      };
    } catch (error: any) {
      const errDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Erreur d'échange de code SSO: ${errDetails}`);
      throw new UnauthorizedException(`Échec de l'authentification SSO: ${errDetails}`);
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        favorites: {
          select: {
            channelId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    return {
      id: user.id,
      ssoId: user.ssoId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      preferences: user.preferences,
      favoriteChannelIds: user.favorites.map((f) => f.channelId),
    };
  }

  async updatePreferences(
    userId: string,
    data: { lastChannelId?: string; favoriteCategoryId?: string; volume?: number; muted?: boolean; theme?: string }
  ) {
    return this.prisma.preference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}
