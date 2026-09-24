// Fares as the API returns them (BR-10, BR-11, FR-FARE-04). Every amount is whole paisa (FR-FARE-06):
// 6600 means ৳66.00. Use formatPaisa() to show an amount to a person.

// The rates a fare was worked out with (BR-11). Stored with every locked fare (FR-FARE-03).
export type FareRates = {
  basePaisa: number; // per seat, never discounted
  perKmPaisa: number;
  poolDiscountBps: number; // basis points of the distance charge: 2000 = 20 %
};

// One passenger's fare, split into the parts shown on screen. The parts always add up:
// farePerSeatPaisa = basePaisa + distanceChargePaisa − discountPaisa, and
// totalPaisa = farePerSeatPaisa × seats.
export type FareBreakdown = {
  pooled: boolean;
  seats: number;
  basePaisa: number;
  distanceChargePaisa: number;
  discountPaisa: number; // 0 when the ride is not pooled
  farePerSeatPaisa: number;
  totalPaisa: number;
};
