import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '../generated/prisma/client.js';
import type { SupabaseClaims } from '../auth/supabase-jwt.verifier.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FileStorage } from '../storage/file-storage.js';
import { detectImageType, MAX_AVATAR_BYTES } from './avatar-image.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

const PROFILE_INCLUDE = {
  preferredSports: {
    select: { slug: true, name: true, icon: true, photoUrl: true },
    orderBy: { name: 'asc' },
  },
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly adminEmails: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorage,
    config: ConfigService,
  ) {
    this.adminEmails = new Set(
      config
        .get<string>('ADMIN_EMAILS', '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  /**
   * Returns the profile for a verified token, creating it on the first
   * request. Emails listed in ADMIN_EMAILS get the ADMIN role.
   */
  async ensureUser(claims: SupabaseClaims): Promise<User> {
    const isAdmin = this.adminEmails.has(claims.email);
    const user = await this.prisma.user.upsert({
      where: { id: claims.sub },
      create: {
        id: claims.sub,
        email: claims.email,
        fullName: claims.fullName,
        avatarUrl: claims.avatarUrl,
        role: isAdmin ? 'ADMIN' : 'CLIENT',
      },
      update: {},
    });
    if (isAdmin && user.role !== 'ADMIN') {
      return this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    }
    return user;
  }

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: PROFILE_INCLUDE });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { preferredSports, ...fields } = dto;
    let sportIds: { id: string }[] | undefined;
    if (preferredSports) {
      const slugs = [...new Set(preferredSports)];
      sportIds = await this.prisma.sport.findMany({
        where: { slug: { in: slugs } },
        select: { id: true },
      });
      if (sportIds.length !== slugs.length) {
        throw new BadRequestException('Невідомий вид спорту');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...fields, ...(sportIds && { preferredSports: { set: sportIds } }) },
      include: PROFILE_INCLUDE,
    });
  }

  /**
   * Stores a new avatar under a fresh name (so browser caches never show
   * the old picture), then deletes the previous file if it was ours.
   */
  async setAvatar(userId: string, file: Uint8Array) {
    if (file.length > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Фото має бути не більше 2 МБ');
    }
    const image = detectImageType(file);
    if (!image) throw new BadRequestException('Завантажте фото у форматі JPEG, PNG або WebP');

    const previous = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const url = await this.storage.upload(
      `avatars/${userId}/${randomUUID()}.${image.extension}`,
      file,
      image.contentType,
    );
    const profile = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      include: PROFILE_INCLUDE,
    });

    // Only files in this user's own folder: the first avatar URL comes from
    // the sign-up metadata, which the user controls.
    const oldPath = previous.avatarUrl && this.storage.pathOf(previous.avatarUrl);
    if (oldPath?.startsWith(`avatars/${userId}/`)) {
      // A leftover file costs little; a failed request after a successful upload costs more.
      await this.storage.remove(oldPath).catch((error: unknown) => {
        this.logger.warn(`Could not delete old avatar ${oldPath}: ${String(error)}`);
      });
    }
    return profile;
  }
}
