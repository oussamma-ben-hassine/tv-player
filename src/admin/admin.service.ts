import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, SourceType } from '../types/enums';
import { validateSafeUrl } from '../common/ssrf.validator';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const totalChannels = await this.prisma.channel.count();
    const activeChannels = await this.prisma.channel.count({ where: { active: true } });
    const totalCategories = await this.prisma.category.count();
    const totalSources = await this.prisma.source.count();
    const totalUsers = await this.prisma.user.count();

    const categoryDistribution = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { channels: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const recentErrors = await this.prisma.playbackError.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const sources = await this.prisma.source.findMany({
      include: {
        _count: { select: { channels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalChannels,
      activeChannels,
      totalCategories,
      totalSources,
      totalUsers,
      categoryDistribution: categoryDistribution.map((c) => ({
        id: c.id,
        name: c.name,
        channelCount: c._count.channels,
      })),
      recentErrors,
      sources,
    };
  }

  // --- Gestion des chaînes ---
  async listAllChannels(params?: { search?: string; categoryId?: string; sourceId?: string }) {
    const where: any = {};
    if (params?.categoryId && params.categoryId !== 'all') {
      where.categoryId = params.categoryId;
    }
    if (params?.sourceId) {
      where.sourceId = params.sourceId;
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { streamUrl: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.channel.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: true,
        source: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  async createChannel(data: {
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
  }) {
    data.streamUrl = validateSafeUrl(data.streamUrl);

    return this.prisma.channel.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl || null,
        streamUrl: data.streamUrl,
        streamType: data.streamType || 'HLS',
        categoryId: data.categoryId || null,
        sourceId: data.sourceId || null,
        language: data.language || null,
        country: data.country || null,
        description: data.description || null,
        sortOrder: data.sortOrder || 0,
        active: data.active !== false,
        isPublic: data.isPublic !== false,
        minRole: data.minRole || Role.USER,
        epgId: data.epgId || null,
      },
      include: {
        category: true,
      },
    });
  }

  async updateChannel(
    id: string,
    data: {
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
    if (data.streamUrl) {
      data.streamUrl = validateSafeUrl(data.streamUrl);
    }

    return this.prisma.channel.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async deleteChannel(id: string) {
    await this.prisma.favorite.deleteMany({
      where: { channelId: id },
    });
    return this.prisma.channel.delete({
      where: { id },
    });
  }

  async deleteChannelsBatch(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { count: 0 };
    }
    await this.prisma.favorite.deleteMany({
      where: { channelId: { in: ids } },
    });
    const result = await this.prisma.channel.deleteMany({
      where: { id: { in: ids } },
    });
    return { count: result.count };
  }

  async toggleChannelActive(id: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Chaîne introuvable.');

    return this.prisma.channel.update({
      where: { id },
      data: { active: !channel.active },
    });
  }

  // --- Gestion des catégories ---
  async createCategory(data: { name: string; icon?: string; sortOrder?: number }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        icon: data.icon || 'Tv',
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async updateCategory(id: string, data: { name?: string; icon?: string; sortOrder?: number }) {
    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    return this.prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
