'use client';
// Turns a zone code into its name for the screens: BAN → Banani. Shows the code until the zone
// list has loaded.
import { useZones } from '../passenger-queries';

export function useZoneName(): (zoneCode: string) => string {
  const { data: zones } = useZones();
  return (zoneCode) => zones?.find((zone) => zone.code === zoneCode)?.name ?? zoneCode;
}
