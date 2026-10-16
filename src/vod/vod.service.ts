import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateSafeUrl } from '../common/ssrf.validator';

@Injectable()
export class VodService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VodService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seedInitialVodIfEmpty();
  }

  async listVod(params?: { type?: string; genre?: string; search?: string }) {
    const where: any = { active: true };

    if (params?.type && params.type !== 'ALL') {
      where.type = params.type;
    }

    if (params?.genre && params.genre !== 'ALL') {
      where.genre = { contains: params.genre, mode: 'insensitive' };
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { overview: { contains: params.search, mode: 'insensitive' } },
        { genre: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).vodItem.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
    });
  }

  async listGenres(): Promise<string[]> {
    const items = await (this.prisma as any).vodItem.findMany({
      where: { active: true },
      select: { genre: true },
    });

    const set = new Set<string>();
    for (const item of items) {
      if (item.genre) {
        item.genre
          .split(',')
          .map((g: string) => g.trim())
          .filter(Boolean)
          .forEach((g: string) => set.add(g));
      }
    }

    return Array.from(set).sort();
  }

  async getVodById(id: string) {
    const item = await (this.prisma as any).vodItem.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Élément VOD introuvable.');
    }
    return item;
  }

  // --- Administration ---
  async listAllAdminVod(params?: { search?: string; type?: string }) {
    const where: any = {};
    if (params?.type && params.type !== 'ALL') {
      where.type = params.type;
    }
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { streamUrl: { contains: params.search, mode: 'insensitive' } },
        { genre: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).vodItem.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createVod(data: {
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
  }) {
    data.streamUrl = validateSafeUrl(data.streamUrl);

    return (this.prisma as any).vodItem.create({
      data: {
        title: data.title,
        type: data.type || 'MOVIE',
        posterUrl: data.posterUrl || null,
        backdropUrl: data.backdropUrl || null,
        streamUrl: data.streamUrl,
        streamType: data.streamType || 'MP4',
        genre: data.genre || 'Action',
        year: data.year ? Number(data.year) : new Date().getFullYear(),
        duration: data.duration || null,
        rating: data.rating || null,
        overview: data.overview || null,
        active: data.active !== false,
      },
    });
  }

  async updateVod(
    id: string,
    data: {
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
    if (data.streamUrl) {
      data.streamUrl = validateSafeUrl(data.streamUrl);
    }

    return (this.prisma as any).vodItem.update({
      where: { id },
      data: {
        ...data,
        year: data.year !== undefined ? Number(data.year) : undefined,
      },
    });
  }

  async deleteVod(id: string) {
    return (this.prisma as any).vodItem.delete({
      where: { id },
    });
  }

  async batchDeleteVod(ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };
    return (this.prisma as any).vodItem.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async seedInitialVodIfEmpty() {
    try {
      const count = await (this.prisma as any).vodItem.count();
      if (count > 0) return;

      this.logger.log('Création du catalogue VOD initial (films & séries de démonstration)...');

      const initialMovies = [
        {
          title: 'Big Buck Bunny',
          type: 'MOVIE',
          genre: 'Animation, Comédie',
          year: 2008,
          duration: '10 min',
          rating: '8.1',
          overview:
            'Un lapin géant au grand cœur décide de donner une leçon à trois rongeurs espiègles qui tyrannisent les créatures de la forêt.',
          posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          streamType: 'MP4',
        },
        {
          title: 'Tears of Steel',
          type: 'MOVIE',
          genre: 'Science-Fiction, Action',
          year: 2012,
          duration: '12 min',
          rating: '7.9',
          overview:
            'Dans un futur dystopique à Amsterdam, un groupe de survivants tente de sauver le monde grâce à une technologie de reconstruction mémorielle.',
          posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          streamType: 'MP4',
        },
        {
          title: 'Sintel',
          type: 'MOVIE',
          genre: 'Animation, Aventure, Fantasy',
          year: 2010,
          duration: '15 min',
          rating: '8.5',
          overview:
            'Une jeune femme solitaire traverse un monde hostile et enneigé à la recherche de son bébé dragon capturé par des prédateurs.',
          posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          streamType: 'MP4',
        },
        {
          title: 'Elephants Dream',
          type: 'MOVIE',
          genre: 'Animation, Science-Fiction',
          year: 2006,
          duration: '11 min',
          rating: '7.6',
          overview:
            'Deux personnages explorent une immense machine surréaliste qui façonne leur perception et leurs rêves.',
          posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          streamType: 'MP4',
        },
        {
          title: 'Wilderness Chronicles',
          type: 'SERIES',
          genre: 'Documentaire, Nature',
          year: 2023,
          duration: '45 min / ep',
          rating: '8.8',
          overview:
            'Une immersion spectaculaire dans les écosystèmes les plus reculés de la planète en très haute définition.',
          posterUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&auto=format&fit=crop&q=80',
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          streamType: 'MP4',
        },
      ];

      for (const m of initialMovies) {
        await (this.prisma as any).vodItem.create({ data: m });
      }

      this.logger.log('Catalogue VOD initial amorcé avec succès.');
    } catch (err: any) {
      this.logger.warn(`Initialisation VOD reportée : ${err.message}`);
    }
  }
}
