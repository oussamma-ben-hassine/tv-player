import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
const cookieSession = require('cookie-session');
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('TVPlayerBootstrap');
  const app = await NestFactory.create(AppModule);

  // Faire confiance au reverse proxy (Traefik / Coolify) pour X-Forwarded-Proto: https
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Configuration des sessions par cookies sécurisés
  const sessionSecret = process.env.SESSION_SECRET || 'tv-player-ultra-secret-key-2026';
  app.use(
    cookieSession({
      name: 'tv_session',
      keys: [sessionSecret],
      maxAge: 30 * 24 * 3600 * 1000, // 30 jours
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Documentation OpenAPI Swagger
  const config = new DocumentBuilder()
    .setTitle('TV Player API')
    .setDescription('Spécification et documentation de l\'API TV Player - Streaming direct & IPTV')
    .setVersion('1.0.0')
    .addTag('Authentification & Profil')
    .addTag('Chaînes TV')
    .addTag('Catégories')
    .addTag('Favoris')
    .addTag('Lecture Streaming')
    .addTag('VOD (Films & Séries)')
    .addTag('Administration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`TV Player démarré avec succès sur le port ${port}`);
  logger.log(`Documentation OpenAPI disponible sur http://localhost:${port}/api/docs`);
}

bootstrap();
