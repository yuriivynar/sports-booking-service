import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import { UsersModule } from '../users/users.module.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { SUPABASE_JWKS, SupabaseJwtVerifier, supabaseIssuer } from './supabase-jwt.verifier.js';

@Module({
  imports: [UsersModule],
  providers: [
    {
      provide: SUPABASE_JWKS,
      inject: [ConfigService],
      // Fetched on the first request and cached; tests replace this provider
      // with a local key set.
      useFactory: (config: ConfigService) =>
        createRemoteJWKSet(new URL(`${supabaseIssuer(config)}/.well-known/jwks.json`)),
    },
    SupabaseJwtVerifier,
    // Order matters: authentication first, then the role check.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
