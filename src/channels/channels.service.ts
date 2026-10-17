import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../types/enums';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    categoryId?: string;
    userRole?: Role;
    onlyFavorites?: boolean;
    userId?: string;
  }) {
    const { search, categoryId, userRole = Role.USER, onlyFavorites, userId } = params;

    let favoriteChannelIds: string[] = [];
    if (userId) {
      const favs = await this.prisma.favorite.findMany({
        where: { userId },
        select: { channelId: true },
      });
      favoriteChannelIds = favs.map((f) => f.channelId);
    }

    const where: any = {
      active: true,
    };

    // Contrôle d'accès par rôle
    if (userRole !== Role.ADMIN) {
      where.minRole = Role.USER;
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { country: { contains: search.trim(), mode: 'insensitive' } },
        { language: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (onlyFavorites && userId) {
      where.id = { in: favoriteChannelIds };
    }

    const channels = await this.prisma.channel.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    return channels.map((ch) => ({
      ...ch,
      isFavorite: favoriteChannelIds.includes(ch.id),
    }));
  }

  async findOne(id: string, userRole: Role = Role.USER) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        category: true,
        source: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!channel || (!channel.active && userRole !== Role.ADMIN)) {
      throw new NotFoundException('Chaîne introuvable ou inactive.');
    }

    if (channel.minRole === Role.ADMIN && userRole !== Role.ADMIN) {
      throw new NotFoundException('Accès restreint à cette chaîne.');
    }

    return channel;
  }
}
