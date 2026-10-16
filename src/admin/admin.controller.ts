import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SourcesService } from '../sources/sources.service';
import { EpgService } from '../epg/epg.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, SourceType } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ParsedM3uChannel } from '../sources/m3u.parser';

@ApiTags('Administration')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly sourcesService: SourcesService,
    private readonly epgService: EpgService,
  ) {}

  @ApiOperation({ summary: 'Obtenir les statistiques et métriques du dashboard' })
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // --- Gestion des chaînes ---
  @ApiOperation({ summary: 'Lister toutes les chaînes pour le back-office' })
  @Get('channels')
  async listChannels(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sourceId') sourceId?: string,
  ) {
    return this.adminService.listAllChannels({ search, categoryId, sourceId });
  }

  @ApiOperation({ summary: 'Créer une nouvelle chaîne manuellement' })
  @Post('channels')
  async createChannel(
    @Body()
    body: {
      name: string;
      logoUrl?: string;
      streamUrl: string;
      streamType?: string;
      categoryId?: string;
      sourceId?: string;
      language?: string;
      country?: string;
      description?: string;
      sortOrder?: number;
      active?: boolean;
      isPublic?: boolean;
      minRole?: Role;
      epgId?: string;
    },
  ) {
    return this.adminService.createChannel(body);
  }

  @ApiOperation({ summary: 'Modifier une chaîne' })
  @Put('channels/:id')
  async updateChannel(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      logoUrl?: string;
      streamUrl?: string;
      streamType?: string;
      categoryId?: string;
      sourceId?: string;
      language?: string;
      country?: string;
      description?: string;
      sortOrder?: number;
      active?: boolean;
      isPublic?: boolean;
      minRole?: Role;
      epgId?: string;
    },
  ) {
    return this.adminService.updateChannel(id, body);
  }

  @ApiOperation({ summary: 'Supprimer une chaîne' })
  @Delete('channels/:id')
  async deleteChannel(@Param('id') id: string) {
    return this.adminService.deleteChannel(id);
  }

  @ApiOperation({ summary: 'Activer ou désactiver une chaîne' })
  @Patch('channels/:id/toggle')
  async toggleChannel(@Param('id') id: string) {
    return this.adminService.toggleChannelActive(id);
  }

  // --- Gestion des sources ---
  @ApiOperation({ summary: 'Lister les sources configurées' })
  @Get('sources')
  async listSources() {
    return this.sourcesService.listSources();
  }

  @ApiOperation({ summary: 'Créer une source externe' })
  @Post('sources')
  async createSource(
    @Body()
    body: {
      name: string;
      type: SourceType;
      url?: string;
      autoSync?: boolean;
      syncIntervalHours?: number;
      config?: any;
    },
  ) {
    return this.sourcesService.createSource(body);
  }

  @ApiOperation({ summary: 'Supprimer une source' })
  @Delete('sources/:id')
  async deleteSource(@Param('id') id: string) {
    return this.sourcesService.deleteSource(id);
  }

  @ApiOperation({ summary: 'Prévisualiser une playlist M3U' })
  @Post('sources/m3u/preview')
  async previewM3u(@Body() body: { url?: string; content?: string }) {
    return this.sourcesService.previewM3u(body);
  }

  @ApiOperation({ summary: 'Importer des chaînes sélectionnées depuis une playlist M3U' })
  @Post('sources/m3u/import')
  async importM3u(
    @Body()
    body: {
      sourceId?: string;
      sourceName?: string;
      sourceUrl?: string;
      channels: ParsedM3uChannel[];
    },
  ) {
    return this.sourcesService.importM3uChannels(body);
  }

  @ApiOperation({ summary: 'Synchroniser un serveur IPTV' })
  @Post('sources/:id/sync-iptv')
  async syncIptv(@Param('id') id: string) {
    return this.sourcesService.syncIptvServer(id);
  }

  // --- Gestion des catégories ---
  @ApiOperation({ summary: 'Créer une catégorie' })
  @Post('categories')
  async createCategory(@Body() body: { name: string; icon?: string; sortOrder?: number }) {
    return this.adminService.createCategory(body);
  }

  @ApiOperation({ summary: 'Modifier une catégorie' })
  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; icon?: string; sortOrder?: number },
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @ApiOperation({ summary: 'Supprimer une catégorie' })
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // --- Import XMLTV EPG ---
  @ApiOperation({ summary: 'Importer un guide XMLTV depuis une URL' })
  @Post('epg/import-xmltv')
  async importXmltv(@Body() body: { url: string }) {
    return this.epgService.importXmltv(body.url);
  }
}
