import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        channel: {
          include: {
            category: true,
          },
        },
      },
    });

    return favorites.map((f) => ({
      ...f.channel,
      isFavorite: true,
      favoritedAt: f.createdAt,
    }));
  }

  async add(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Chaîne introuvable.');
    }

    return this.prisma.favorite.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      update: {},
      create: {
        userId,
        channelId,
      },
    });
  }

  async remove(userId: string, channelId: string) {
    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        channelId,
      },
    });
    return { success: true };
  }
}
