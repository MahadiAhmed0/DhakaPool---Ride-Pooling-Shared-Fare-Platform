// Human-readable words for statuses and payments (NFR-USA-02). The API sends codes such as STARTED;
// the screens always show these words instead.
import type { PaymentStatus, PoolStatus, RideStatus } from '@dhakapool/shared';

export const RIDE_STATUS_LABELS: Record<RideStatus, string> = {
  REQUESTED: 'Finding a Tesla',
  MATCHED: 'Driver on the way',
  DRIVER_ARRIVED: 'Driver is here',
  STARTED: 'On the way',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const POOL_STATUS_LABELS: Record<PoolStatus, string> = {
  OPEN: 'Picking up',
  DRIVER_ARRIVED: 'At the pickup',
  STARTED: 'On the way',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING_CASH: 'Cash due',
  PAID: 'Paid',
  UNPAID: 'Not paid',
};
