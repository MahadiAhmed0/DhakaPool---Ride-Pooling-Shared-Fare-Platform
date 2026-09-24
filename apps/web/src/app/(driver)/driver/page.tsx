// The driver's home page. Its screens (dashboard, requests, trip, history) are built with the
// driver UI; until then it confirms the sign-in and the role routing work.
import { Card } from '@/components/ui/card';

export default function DriverHomePage() {
  return (
    <Card title="Driver dashboard">
      <p>You are signed in as a driver. The driver screens are on their way.</p>
    </Card>
  );
}
