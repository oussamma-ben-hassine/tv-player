import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Favoris')
@UseGuards(AuthGuard)
@Controller('api/v1/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiOperation({ summary: 'Lister les chaînes favorites de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des chaînes en favoris' })
  @Get()
  async getFavorites(@CurrentUser('id') userId: string) {
    return this.favoritesService.findAll(userId);
  }

  @ApiOperation({ summary: 'Ajouter une chaîne aux favoris' })
  @ApiResponse({ status: 201, description: 'Chaîne ajoutée aux favoris' })
  @Post()
  async addFavorite(@CurrentUser('id') userId: string, @Body() body: { channelId: string }) {
    return this.favoritesService.add(userId, body.channelId);
  }

  @ApiOperation({ summary: 'Retirer une chaîne des favoris' })
  @ApiResponse({ status: 200, description: 'Chaîne retirée des favoris' })
  @Delete(':channelId')
  async removeFavorite(@CurrentUser('id') userId: string, @Param('channelId') channelId: string) {
    return this.favoritesService.remove(userId, channelId);
  }
}
