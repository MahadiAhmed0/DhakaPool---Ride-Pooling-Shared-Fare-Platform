// API smoke load test (NFR-PERF-01, TC-46): 20 concurrent users for 60 s against a running API,
// then the latency percentiles. It passes when p95 is under 300 ms and no request failed.
// Only read requests are sent, so running it never changes the data.
//
//   npm run load:smoke                      (API on http://localhost:4000, seeded personas)
//   BASE_URL=http://localhost:4000 CONCURRENCY=20 DURATION_SECONDS=60 npm run load:smoke

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);
const DURATION_SECONDS = Number(process.env.DURATION_SECONDS ?? 60);
const P95_TARGET_MS = Number(process.env.P95_TARGET_MS ?? 300);
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;

const PASSENGER_EMAIL = 'nusrat@dhakapool.test';
const DRIVER_EMAIL = 'jashim@dhakapool.test';
const MS_PER_SECOND = 1000;

// Signs one seeded persona in and returns their session cookie.
async function signIn(email) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ emailOrPhone: email, password: DEMO_PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(`Signing in ${email} failed with ${response.status}. Is the database seeded?`);
  }
  const cookie = response.headers.get('set-cookie') ?? '';
  return cookie.split(';')[0];
}

// The screens people use most: a passenger's history, wallet and a fare estimate, and a
// driver's status and trips. Each entry is one request.
function buildRequests(passengerCookie, driverCookie) {
  const estimate = { pickupZoneCode: 'BAN', destinationZoneCode: 'MHK', seats: 1 };
  return [
    { name: 'GET /health', path: '/health' },
    { name: 'GET /api/zones', path: '/api/zones', cookie: passengerCookie },
    { name: 'GET /api/rides (history)', path: '/api/rides?scope=history', cookie: passengerCookie },
    { name: 'GET /api/wallet', path: '/api/wallet', cookie: passengerCookie },
    {
      name: 'POST /api/fares/estimate',
      path: '/api/fares/estimate',
      cookie: passengerCookie,
      body: estimate,
    },
    {
      name: 'GET /api/driver/availability',
      path: '/api/driver/availability',
      cookie: driverCookie,
    },
    {
      name: 'GET /api/driver/pools (history)',
      path: '/api/driver/pools?scope=history',
      cookie: driverCookie,
    },
  ];
}

async function timeOne(request) {
  const headers = { cookie: request.cookie ?? '' };
  if (request.body) {
    headers['content-type'] = 'application/json';
  }
  const startedAt = performance.now();
  const response = await fetch(`${BASE_URL}${request.path}`, {
    method: request.body ? 'POST' : 'GET',
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
  });
  await response.arrayBuffer();
  return { name: request.name, ms: performance.now() - startedAt, ok: response.ok };
}

// One simulated user: sends the requests one after another, round and round, until time is up.
async function runUser(requests, deadline, offset, results) {
  let next = offset;
  while (Date.now() < deadline) {
    const request = requests[next % requests.length];
    next += 1;
    try {
      results.push(await timeOne(request));
    } catch {
      results.push({ name: request.name, ms: 0, ok: false });
    }
  }
}

function percentile(sortedMs, fraction) {
  if (sortedMs.length === 0) {
    return 0;
  }
  const index = Math.min(sortedMs.length - 1, Math.ceil(fraction * sortedMs.length) - 1);
  return sortedMs[index];
}

function summarise(results) {
  const sortedMs = results.map((result) => result.ms).sort((a, b) => a - b);
  return {
    requests: results.length,
    failed: results.filter((result) => !result.ok).length,
    p50: percentile(sortedMs, 0.5),
    p95: percentile(sortedMs, 0.95),
    p99: percentile(sortedMs, 0.99),
    max: sortedMs.at(-1) ?? 0,
  };
}

function printReport(results) {
  const all = summarise(results);
  const names = [...new Set(results.map((result) => result.name))];
  const rows = names.map((name) => {
    const one = summarise(results.filter((result) => result.name === name));
    return { request: name, count: one.requests, failed: one.failed, 'p95 ms': one.p95.toFixed(1) };
  });
  console.table(rows);
  console.log(
    `${all.requests} requests in ${DURATION_SECONDS} s (${(all.requests / DURATION_SECONDS).toFixed(0)}/s), ` +
      `${all.failed} failed. p50 ${all.p50.toFixed(1)} ms, p95 ${all.p95.toFixed(1)} ms, ` +
      `p99 ${all.p99.toFixed(1)} ms, max ${all.max.toFixed(1)} ms.`,
  );
  return all;
}

async function main() {
  if (!DEMO_PASSWORD) {
    throw new Error('Set SEED_DEMO_PASSWORD (it is in .env.example) so the personas can sign in.');
  }
  const passengerCookie = await signIn(PASSENGER_EMAIL);
  const driverCookie = await signIn(DRIVER_EMAIL);
  const requests = buildRequests(passengerCookie, driverCookie);
  console.log(`${CONCURRENCY} users for ${DURATION_SECONDS} s against ${BASE_URL}…`);

  const results = [];
  const deadline = Date.now() + DURATION_SECONDS * MS_PER_SECOND;
  const users = Array.from({ length: CONCURRENCY }, (_, index) =>
    runUser(requests, deadline, index, results),
  );
  await Promise.all(users);

  const all = printReport(results);
  const passed = all.failed === 0 && all.p95 < P95_TARGET_MS;
  console.log(passed ? `PASS: p95 is under ${P95_TARGET_MS} ms.` : 'FAIL: see the numbers above.');
  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
