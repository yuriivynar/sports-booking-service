export { cn } from 'cn';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids are UUIDs; anything else cannot exist, so pages answer 404 without asking the API. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
