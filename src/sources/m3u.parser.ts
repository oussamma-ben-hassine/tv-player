export interface ParsedM3uChannel {
  name: string;
  streamUrl: string;
  logoUrl?: string;
  categoryName?: string;
  epgId?: string;
  country?: string;
  language?: string;
}

export function parseM3uContent(content: string): ParsedM3uChannel[] {
  const lines = content.split(/\r?\n/);
  const channels: ParsedM3uChannel[] = [];

  let currentInfo: Partial<ParsedM3uChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentInfo = {};

      // Extraire tvg-id
      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      if (idMatch && idMatch[1]) {
        currentInfo.epgId = idMatch[1];
      }

      // Extraire tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      if (logoMatch && logoMatch[1]) {
        currentInfo.logoUrl = logoMatch[1];
      }

      // Extraire group-title (catégorie)
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      if (groupMatch && groupMatch[1]) {
        currentInfo.categoryName = groupMatch[1].trim();
      }

      // Extraire tvg-country
      const countryMatch = line.match(/tvg-country="([^"]*)"/i);
      if (countryMatch && countryMatch[1]) {
        currentInfo.country = countryMatch[1].trim();
      }

      // Extraire tvg-language
      const langMatch = line.match(/tvg-language="([^"]*)"/i);
      if (langMatch && langMatch[1]) {
        currentInfo.language = langMatch[1].trim();
      }

      // Extraire le nom de la chaîne (après la dernière virgule)
      const lastCommaIdx = line.lastIndexOf(',');
      if (lastCommaIdx !== -1) {
        currentInfo.name = line.substring(lastCommaIdx + 1).trim();
      } else {
        currentInfo.name = 'Chaîne inconnue';
      }
    } else if (!line.startsWith('#') && currentInfo) {
      // C'est l'URL du flux
      if (line.startsWith('http://') || line.startsWith('https://')) {
        channels.push({
          name: currentInfo.name || 'Chaîne',
          streamUrl: line,
          logoUrl: currentInfo.logoUrl,
          categoryName: currentInfo.categoryName || 'Généraliste',
          epgId: currentInfo.epgId,
          country: currentInfo.country,
          language: currentInfo.language,
        });
      }
      currentInfo = null;
    }
  }

  return channels;
}
