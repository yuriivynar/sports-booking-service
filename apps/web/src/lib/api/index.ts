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

export type Booking = Schemas['BookingDto'];
export type BookingQuote = Schemas['BookingQuoteDto'];
export type BookingStatus = Schemas['BookingStatus'];
export type BookingType = Schemas['BookingType'];
export type CreateBookingBody = Schemas['CreateBookingDto'];
export type PriceLine = Schemas['PriceLineDto'];
export type Availability = Schemas['AvailabilityDto'];

/** Turns a Nest error body ({ message: string | string[] }) into one sentence. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: string | string[] } | null | undefined)?.message;
  if (Array.isArray(message)) return message.join('. ');
  return message || fallback;
}

export type MembershipPlan = Schemas['MembershipPlanDto'];
export type Membership = Schemas['MembershipDto'];
export type Loyalty = Schemas['LoyaltyDto'];
export type NotificationItem = Schemas['NotificationDto'];
export type Offers = Schemas['OffersDto'];
export type MembershipKind = Schemas['MembershipKind'];
export type MembershipStatus = Schemas['MembershipStatus'];
export type LoyaltyTier = Schemas['LoyaltyTier'];

export type AdminCenter = Schemas['AdminCenterDto'];
export type AdminHall = Schemas['AdminHallDto'];
export type AdminTrainer = Schemas['AdminTrainerDto'];
export type AdminSection = Schemas['AdminSectionDto'];
export type AdminSession = Schemas['AdminSessionDto'];
export type AdminPromotion = Schemas['AdminPromotionDto'];
export type AdminPlan = Schemas['AdminPlanDto'];
export type AdminStats = Schemas['AdminStatsDto'];
export type JobRun = Schemas['JobRunDto'];
export type Removal = Schemas['RemovalDto'];
