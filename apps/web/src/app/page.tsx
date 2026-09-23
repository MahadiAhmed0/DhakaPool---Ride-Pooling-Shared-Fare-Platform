// Home page placeholder until the passenger and driver screens are built.
import { ApiStatus } from '@/components/api-status';

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Dhaka Tesla Pool</h1>
      <p className="mt-2">Share a seat. Split the fare. Survive Dhaka traffic.</p>
      <ApiStatus />
    </main>
  );
}
