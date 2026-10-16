import { PrismaClient, Role, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Démarrage de l\'initialisation des données TV Player...');

  // 1. Initialisation des Catégories
  const categoriesData = [
    { name: 'Information', slug: 'information', icon: 'Newspaper', sortOrder: 1 },
    { name: 'International', slug: 'international', icon: 'Globe', sortOrder: 2 },
    { name: 'Science & Espace', slug: 'science', icon: 'Rocket', sortOrder: 3 },
    { name: 'Sport & Action', slug: 'sport', icon: 'Trophy', sortOrder: 4 },
    { name: 'Culture & Musique', slug: 'culture', icon: 'Music', sortOrder: 5 },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap.set(cat.slug, created.id);
  }
  console.log('[SEED] Catégories initialisées.');

  // 2. Source par défaut (Chaînes Officielles)
  const defaultSource = await prisma.source.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { name: 'Bouquet Initial Recommandé' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Bouquet Initial Recommandé',
      type: SourceType.MANUAL,
      autoSync: false,
      lastSyncStatus: 'READY',
    },
  });

  // 3. Chaînes TV HD Live autorisées & légales
  const channels = [
    {
      name: 'France 24 (Français)',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/France_24_logo.svg/512px-France_24_logo.svg.png',
      streamUrl: 'https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8',
      streamType: 'HLS',
      categoryId: categoryMap.get('information'),
      sourceId: defaultSource.id,
      language: 'Français',
      country: 'France',
      description: 'L\'information internationale en direct 24h/24 en français.',
      sortOrder: 1,
      active: true,
      isPublic: true,
      minRole: Role.USER,
      epgId: 'france24.fr',
    },
    {
      name: 'France 24 (English)',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/France_24_logo.svg/512px-France_24_logo.svg.png',
      streamUrl: 'https://static.france24.com/live/F24_EN_HI_HLS/live_tv.m3u8',
      streamType: 'HLS',
      categoryId: categoryMap.get('international'),
      sourceId: defaultSource.id,
      language: 'English',
      country: 'France',
      description: 'International news and round-the-clock live broadcasting in English.',
      sortOrder: 2,
      active: true,
      isPublic: true,
      minRole: Role.USER,
      epgId: 'france24.en',
    },
    {
      name: 'Euronews Français',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Euronews_2016_logo.svg/512px-Euronews_2016_logo.svg.png',
      streamUrl: 'https://euronews-euronews-french-1-fr.samsung.wurl.com/manifest/playlist.m3u8',
      streamType: 'HLS',
      categoryId: categoryMap.get('information'),
      sourceId: defaultSource.id,
      language: 'Français',
      country: 'Europe',
      description: 'Toute l\'actualité européenne et mondiale analysée par Euronews.',
      sortOrder: 3,
      active: true,
      isPublic: true,
      minRole: Role.USER,
      epgId: 'euronews.fr',
    },
    {
      name: 'DW English HD',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol.svg/512px-Deutsche_Welle_symbol.svg.png',
      streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      streamType: 'HLS',
      categoryId: categoryMap.get('international'),
      sourceId: defaultSource.id,
      language: 'English',
      country: 'Germany',
      description: 'Deutsche Welle global news, business, politics, and culture.',
      sortOrder: 4,
      active: true,
      isPublic: true,
      minRole: Role.USER,
      epgId: 'dw.en',
    },
    {
      name: 'NASA TV Public HD',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png',
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      streamType: 'HLS',
      categoryId: categoryMap.get('science'),
      sourceId: defaultSource.id,
      language: 'English',
      country: 'USA',
      description: 'Lancements spatiaux, Station Spatiale Internationale ISS et exploration cosmique en direct.',
      sortOrder: 5,
      active: true,
      isPublic: true,
      minRole: Role.USER,
      epgId: 'nasa.tv',
    },
    {
      name: 'Red Bull TV HD',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/fr/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png',
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      streamType: 'HLS',
      categoryId: categoryMap.get('sport'),
      sourceId: defaultSource.id,
      language: 'English / Multi',
      country: 'Autriche',
      description: 'Sports extrêmes, Formule 1, acrobaties, documentaires outdoor et aventures spectaculaires.',
      sortOrder: 6,
      active: true,
      isPublic: true,
      minRole: Role.USER,
      epgId: 'redbull.tv',
    },
  ];

  for (const ch of channels) {
    const existing = await prisma.channel.findFirst({
      where: { name: ch.name },
    });
    if (!existing) {
      await prisma.channel.create({ data: ch });
    } else {
      await prisma.channel.update({
        where: { id: existing.id },
        data: {
          streamUrl: ch.streamUrl,
          logoUrl: ch.logoUrl,
          categoryId: ch.categoryId,
          active: true,
        },
      });
    }
  }

  console.log('[SEED] Chaînes initiales ajoutées avec succès.');
}

main()
  .catch((e) => {
    console.error('[SEED] Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
