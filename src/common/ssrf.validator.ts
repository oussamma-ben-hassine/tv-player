import { BadRequestException } from '@nestjs/common';
import { URL } from 'url';

export function validateSafeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new BadRequestException('URL invalide ou absente.');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new BadRequestException('Format d\'URL invalide.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Seuls les protocoles HTTP et HTTPS sont autorisés.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Protection SSRF stricte contre adresses locales et réservées
  const blockedPatterns = [
    /^localhost$/,
    /^127\./,
    /^0\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/,
    /^fe80:/,
    /^::1$/,
    /^internal\./,
    /^docker\./,
    /\.local$/,
    /\.internal$/,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(hostname)) {
      throw new BadRequestException('Accès aux réseaux privés ou locaux interdit (SSRF protection).');
    }
  }

  return parsed.toString();
}
