import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

/** Base URL of the NestJS REST API, including the global `/api` prefix. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Paths in the OpenAPI schema already start with /api, so the client needs the origin only. */
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/**
 * Typed REST client generated from the API's OpenAPI document
 * (`pnpm --filter web api:types`). Pass the Supabase access token for
 * routes that need a signed-in user.
 */
export function apiClient(accessToken?: string) {
  return createClient<paths>({
    baseUrl: API_ORIGIN,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export type Schemas = components['schemas'];
export type Sport = Schemas['SportDto'];
export type CenterSummary = Schemas['CenterSummaryDto'];
export type CenterDetail = Schemas['CenterDetailDto'];
export type SectionSummary = Schemas['SectionSummaryDto'];
export type SectionDetail = Schemas['SectionDetailDto'];
export type SectionPage = Schemas['SectionPageDto'];
export type Session = Schemas['SessionDto'];
export type Hall = Schemas['HallDto'];
export type Trainer = Schemas['TrainerDto'];
export type Promotion = Schemas['PromotionDto'];
export type UserProfile = Schemas['UserProfileDto'];
export type SkillLevel = Schemas['SkillLevel'];
export type AgeGroup = Schemas['AgeGroup'];
export type HallKind = Schemas['HallKind'];
