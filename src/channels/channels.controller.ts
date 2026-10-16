import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserSession } from '../auth/auth.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Chaînes TV')
@UseGuards(AuthGuard)
@Controller('api/v1/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @ApiOperation({ summary: 'Lister les chaînes TV autorisées' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche textuelle par nom' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filtrer par catégorie' })
  @ApiQuery({ name: 'onlyFavorites', required: false, type: Boolean, description: 'Afficher uniquement les favoris' })
  @ApiResponse({ status: 200, description: 'Liste ordonnée des chaînes accessibles' })
  @Get()
  async getChannels(
    @CurrentUser() user: UserSession,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('onlyFavorites') onlyFavorites?: string,
  ) {
    return this.channelsService.findAll({
      search,
      categoryId,
      userRole: user.role,
      onlyFavorites: onlyFavorites === 'true' || onlyFavorites === '1',
      userId: user.id,
    });
  }

  @ApiOperation({ summary: 'Consulter le détail d\'une chaîne' })
  @ApiResponse({ status: 200, description: 'Informations détaillées de la chaîne' })
  @Get(':id')
  async getChannel(@Param('id') id: string, @CurrentUser() user: UserSession) {
    return this.channelsService.findOne(id, user.role);
  }
}
