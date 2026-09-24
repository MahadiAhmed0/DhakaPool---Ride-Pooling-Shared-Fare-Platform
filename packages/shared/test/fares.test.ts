// The fare-estimate request rules (FR-PAX-02, FR-PAX-03), shared by the API and the web form.
import { describe, expect, it } from 'vitest';
import { fareEstimateSchema } from '../src/index.ts';

const nusratsTrip = { pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 1 };

describe('fareEstimateSchema', () => {
  it("accepts Nusrat's trip from Banani to Mohakhali", () => {
    expect(fareEstimateSchema.parse(nusratsTrip)).toEqual(nusratsTrip);
  });

  it('turns lower-case zone codes into capitals', () => {
    const trip = fareEstimateSchema.parse({ ...nusratsTrip, pickupZoneCode: ' ban ' });
    expect(trip.pickupZoneCode).toBe('BAN');
  });

  it('rejects a trip that starts and ends in the same zone', () => {
    const result = fareEstimateSchema.safeParse({ ...nusratsTrip, destinationZoneCode: 'BAN' });
    expect(result.error?.issues[0]?.path).toEqual(['destinationZoneCode']);
  });

  it('allows 1 to 6 seats and nothing else', () => {
    expect(fareEstimateSchema.safeParse({ ...nusratsTrip, seats: 6 }).success).toBe(true);
    expect(fareEstimateSchema.safeParse({ ...nusratsTrip, seats: 0 }).success).toBe(false);
    expect(fareEstimateSchema.safeParse({ ...nusratsTrip, seats: 7 }).success).toBe(false);
  });

  it('rejects a zone code that is not three letters or digits', () => {
    expect(fareEstimateSchema.safeParse({ ...nusratsTrip, pickupZoneCode: 'BANANI' }).success).toBe(
      false,
    );
  });
});
