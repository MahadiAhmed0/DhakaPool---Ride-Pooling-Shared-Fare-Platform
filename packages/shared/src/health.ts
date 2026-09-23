// Shape of the health-check response (NFR-REL-02), used by the API and shown by the web app.

export type HealthStatus = {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
};
