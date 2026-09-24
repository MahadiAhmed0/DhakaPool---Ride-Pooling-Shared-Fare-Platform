// Dhaka zones, distances and neighbours — reference data from SRS §13.3 (A-01, BR-08, BR-09).
// Each distance and each neighbour pair is written once; the seed stores both directions,
// so the tables are symmetric by construction.

export type ZoneSeed = { code: string; name: string; lat: number; lng: number };

export const ZONES: ZoneSeed[] = [
  { code: 'BAN', name: 'Banani', lat: 23.7937, lng: 90.4066 },
  { code: 'GL1', name: 'Gulshan 1', lat: 23.7808, lng: 90.4169 },
  { code: 'GL2', name: 'Gulshan 2', lat: 23.7925, lng: 90.4155 },
  { code: 'MHK', name: 'Mohakhali', lat: 23.778, lng: 90.405 },
  { code: 'TEJ', name: 'Tejgaon', lat: 23.764, lng: 90.393 },
  { code: 'FRM', name: 'Farmgate', lat: 23.7561, lng: 90.3872 },
  { code: 'DHN', name: 'Dhanmondi', lat: 23.7461, lng: 90.3742 },
  { code: 'MIR', name: 'Mirpur', lat: 23.8069, lng: 90.3687 },
  { code: 'UTR', name: 'Uttara', lat: 23.8759, lng: 90.3795 },
  { code: 'BSH', name: 'Bashundhara', lat: 23.8193, lng: 90.4526 },
];

// [zone, zone, road distance in metres] — the km values of SRS §13.3 × 1,000.
// prettier-ignore
export const DISTANCES_M: [string, string, number][] = [
  ['BAN', 'GL1', 2500], ['BAN', 'GL2', 2000], ['BAN', 'MHK', 3000], ['BAN', 'TEJ', 5000],
  ['BAN', 'FRM', 7000], ['BAN', 'DHN', 10000], ['BAN', 'MIR', 8500], ['BAN', 'UTR', 11000],
  ['BAN', 'BSH', 5500],
  ['GL1', 'GL2', 2000], ['GL1', 'MHK', 2500], ['GL1', 'TEJ', 4000], ['GL1', 'FRM', 6500],
  ['GL1', 'DHN', 9500], ['GL1', 'MIR', 10000], ['GL1', 'UTR', 13000], ['GL1', 'BSH', 6000],
  ['GL2', 'MHK', 4000], ['GL2', 'TEJ', 5500], ['GL2', 'FRM', 8000], ['GL2', 'DHN', 11000],
  ['GL2', 'MIR', 10000], ['GL2', 'UTR', 12000], ['GL2', 'BSH', 4500],
  ['MHK', 'TEJ', 2500], ['MHK', 'FRM', 4500], ['MHK', 'DHN', 7500], ['MHK', 'MIR', 8000],
  ['MHK', 'UTR', 13500], ['MHK', 'BSH', 7500],
  ['TEJ', 'FRM', 2500], ['TEJ', 'DHN', 5500], ['TEJ', 'MIR', 8500], ['TEJ', 'UTR', 15000],
  ['TEJ', 'BSH', 8500],
  ['FRM', 'DHN', 3500], ['FRM', 'MIR', 7000], ['FRM', 'UTR', 17000], ['FRM', 'BSH', 10500],
  ['DHN', 'MIR', 8000], ['DHN', 'UTR', 20000], ['DHN', 'BSH', 13500],
  ['MIR', 'UTR', 12000], ['MIR', 'BSH', 11500],
  ['UTR', 'BSH', 9000],
];

// Neighbouring zones used by the matching rule (BR-02 (c)).
// prettier-ignore
export const ADJACENT_PAIRS: [string, string][] = [
  ['BAN', 'GL1'], ['BAN', 'GL2'], ['BAN', 'MHK'],
  ['GL1', 'GL2'], ['GL1', 'MHK'], ['GL1', 'TEJ'],
  ['GL2', 'BSH'],
  ['MHK', 'TEJ'],
  ['TEJ', 'FRM'],
  ['FRM', 'DHN'], ['FRM', 'MIR'],
  ['UTR', 'BSH'],
];
