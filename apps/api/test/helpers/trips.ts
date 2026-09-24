// The reference personas' usual trips (SRS §6.4) and the steps most pooling tests start with:
// a driver going online and passengers requesting rides, all through the real API.
import type request from 'supertest';
import { expect } from 'vitest';

type Agent = ReturnType<typeof request.agent>;

export const NUSRATS_TRIP = {
  pickupZoneCode: 'BAN',
  destinationZoneCode: 'MHK',
  seats: 1,
  paymentMethod: 'TESLAPAY',
};
export const RAFIQS_TRIP = {
  pickupZoneCode: 'BAN',
  destinationZoneCode: 'GL1',
  seats: 1,
  paymentMethod: 'CASH', // Rafiq has ৳0.00 in TeslaPay
};
export const SHIRINS_TRIP = {
  pickupZoneCode: 'BAN',
  destinationZoneCode: 'TEJ',
  seats: 1,
  paymentMethod: 'TESLAPAY',
};

export async function goOnline(driver: Agent, zoneCode = 'BAN'): Promise<void> {
  const response = await driver
    .put('/api/driver/availability')
    .send({ availability: 'ONLINE', zoneCode });
  expect(response.status).toBe(200);
}

// Returns the new ride's id.
export async function requestRide(
  passenger: Agent,
  trip: Record<string, unknown>,
): Promise<string> {
  const response = await passenger.post('/api/rides').send(trip);
  expect(response.status).toBe(201);
  return response.body.ride.id as string;
}

export async function accept(driver: Agent, rideId: string): Promise<void> {
  const response = await driver.post(`/api/driver/requests/${rideId}/accept`);
  expect(response.status).toBe(200);
}
