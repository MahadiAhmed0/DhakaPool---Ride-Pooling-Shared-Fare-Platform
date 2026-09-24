// One ride in full: its status timeline and fare breakdown (FR-PAX-10).
import { RideDetailView } from './ride-detail';

export default async function RideDetailPage({ params }: PageProps<'/rides/[id]'>) {
  const { id } = await params;
  return <RideDetailView rideId={id} />;
}
