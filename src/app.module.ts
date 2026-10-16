import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { CategoriesModule } from './categories/categories.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PlaybackModule } from './playback/playback.module';
import { SourcesModule } from './sources/sources.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ChannelsModule,
    CategoriesModule,
    FavoritesModule,
    PlaybackModule,
    SourcesModule,
    AdminModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      serveRoot: '/',
      exclude: ['/api/(.*)', '/auth/(.*)', '/health'],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
