import { Controller, Get, Req, Res, Query, UnauthorizedException, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthService, UserSession } from './auth.service';
import { Response, Request } from 'express';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentification & Profil')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Démarrer le flux d\'authentification SSO OIDC avec PKCE' })
  @Get('auth/login')
  login(@Req() req: any, @Res() res: Response) {
    const { codeVerifier, codeChallenge, state } = this.authService.generatePkcePair();
    if (req.session) {
      req.session.pkce_verifier = codeVerifier;
      req.session.oauth_state = state;
    }
    this.authService.savePkceVerifier(state, codeVerifier);

    const authUrl = this.authService.getAuthorizationUrl(codeChallenge, state);
    return res.redirect(authUrl);
  }

  @ApiOperation({ summary: 'Callback après connexion SSO' })
  @Get('auth/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(`/?error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code) {
      return res.redirect('/?error=code_manquant');
    }

    const savedState = req.session?.oauth_state;
    let codeVerifier = req.session?.pkce_verifier;

    if (!codeVerifier && state) {
      codeVerifier = this.authService.getPkceVerifier(state);
    }

    if (savedState && state && state !== savedState) {
      return res.redirect('/?error=state_invalide');
    }

    try {
      const userSession = await this.authService.handleCallback(code, codeVerifier);
      if (req.session) {
        req.session.user = userSession;
        delete req.session.pkce_verifier;
        delete req.session.oauth_state;
      }

      return res.redirect('/');
    } catch (err: any) {
      return res.redirect(`/?error=${encodeURIComponent(err.message || 'erreur_connexion')}`);
    }
  }

  @ApiOperation({ summary: 'Déconnexion' })
  @Get('auth/logout')
  logout(@Req() req: any, @Res() res: Response) {
    req.session = null;
    return res.redirect(this.authService.getLogoutUrl());
  }

  @ApiOperation({ summary: 'Récupérer le profil et préférences de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @Get('api/v1/me')
  async getMe(@Req() req: any) {
    const sessionUser = req.session?.user as UserSession | undefined;
    if (!sessionUser) {
      return { authenticated: false, user: null };
    }

    try {
      const profile = await this.authService.getUserProfile(sessionUser.id);
      return {
        authenticated: true,
        user: profile,
      };
    } catch {
      return { authenticated: false, user: null };
    }
  }

  @ApiOperation({ summary: 'Mettre à jour les préférences de l\'utilisateur' })
  @UseGuards(AuthGuard)
  @Patch('api/v1/preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      lastChannelId?: string;
      favoriteCategoryId?: string;
      volume?: number;
      muted?: boolean;
      theme?: string;
    },
  ) {
    return this.authService.updatePreferences(userId, body);
  }
}
