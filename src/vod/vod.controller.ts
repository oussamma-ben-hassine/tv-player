import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { VodService } from './vod.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../types/enums';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('VOD (Films & Séries)')
@UseGuards(AuthGuard)
@Controller('api/v1/vod')
export class VodController {
  constructor(private readonly vodService: VodService) {}

  @ApiOperation({ summary: 'Lister les films et séries du catalogue VOD' })
  @Get()
  async listVod(
    @Query('type') type?: string,
    @Query('genre') genre?: string,
    @Query('search') search?: string,
  ) {
    return this.vodService.listVod({ type, genre, search });
  }

  @ApiOperation({ summary: 'Obtenir la liste des genres VOD disponibles' })
  @Get('genres')
  async listGenres() {
    return this.vodService.listGenres();
  }

  @ApiOperation({ summary: 'Détails d\'un élément VOD' })
  @Get(':id')
  async getVodById(@Param('id') id: string) {
    return this.vodService.getVodById(id);
  }
}

@ApiTags('Administration VOD')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/v1/admin/vod')
export class AdminVodController {
  constructor(private readonly vodService: VodService) {}

  @ApiOperation({ summary: 'Lister tous les éléments VOD pour le back-office' })
  @Get()
  async listAllAdminVod(
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.vodService.listAllAdminVod({ search, type });
  }

  @ApiOperation({ summary: 'Ajouter un film ou une série VOD' })
  @Post()
  async createVod(
    @Body()
    body: {
      title: string;
      type?: string;
      posterUrl?: string;
      backdropUrl?: string;
      streamUrl: string;
      streamType?: string;
      genre?: string;
      year?: number;
      duration?: string;
      rating?: string;
      overview?: string;
      active?: boolean;
    },
  ) {
    return this.vodService.createVod(body);
  }

  @ApiOperation({ summary: 'Modifier un élément VOD' })
  @Put(':id')
  async updateVod(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      type?: string;
      posterUrl?: string;
      backdropUrl?: string;
      streamUrl?: string;
      streamType?: string;
      genre?: string;
      year?: number;
      duration?: string;
      rating?: string;
      overview?: string;
      active?: boolean;
    },
  ) {
    return this.vodService.updateVod(id, body);
  }

  @ApiOperation({ summary: 'Supprimer un élément VOD' })
  @Delete(':id')
  async deleteVod(@Param('id') id: string) {
    return this.vodService.deleteVod(id);
  }

  @ApiOperation({ summary: 'Supprimer plusieurs éléments VOD' })
  @Post('batch-delete')
  async batchDeleteVod(@Body() body: { ids: string[] }) {
    return this.vodService.batchDeleteVod(body.ids);
  }
}
