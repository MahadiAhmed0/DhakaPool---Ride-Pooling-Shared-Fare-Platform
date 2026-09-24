// Zones: the Dhaka areas a passenger picks up from and travels to (FR-PAX-01, A-01, BR-08).
// Each zone has a three-letter code, for example BAN = Banani and MHK = Mohakhali.
import { z } from 'zod';

const ZONE_CODE_PATTERN = /^[A-Z0-9]{3}$/;

// Accepts "ban" as well as "BAN". Whether the zone exists is checked by the API.
export const zoneCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ZONE_CODE_PATTERN, 'Please choose a zone from the list.');

export type Zone = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};
