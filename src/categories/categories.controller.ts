import { Controller, Get, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserSession } from '../auth/auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Catégories')
@UseGuards(AuthGuard)
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Lister les catégories avec le nombre de chaînes' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  @Get()
  async getCategories(@CurrentUser() user: UserSession) {
    return this.categoriesService.findAll(user.role);
  }
}
