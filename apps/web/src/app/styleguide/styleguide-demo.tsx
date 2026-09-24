'use client';
// Every component of components/ui with example data from the reference personas.
import { useState } from 'react';
import { Badge, RideStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FareBreakdown } from '@/components/ui/fare-breakdown';
import { Field, Input, Select } from '@/components/ui/field';
import { MoneyText } from '@/components/ui/money-text';
import { SeatMeter } from '@/components/ui/seat-meter';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusStepper } from '@/components/ui/status-stepper';
import { Toggle } from '@/components/ui/toggle';

const NUSRATS_SHARED_FARE = {
  pooled: true,
  seats: 1,
  basePaisa: 3000,
  distanceChargePaisa: 4500,
  discountPaisa: 900,
  farePerSeatPaisa: 6600,
  totalPaisa: 6600,
};

function ButtonsSection({ onOpenDialog }: { onOpenDialog: () => void }) {
  return (
    <Card title="Buttons">
      <div className="flex flex-wrap gap-3">
        <Button>Request ride</Button>
        <Button variant="secondary">Back</Button>
        <Button variant="danger" onClick={onOpenDialog}>
          Cancel ride
        </Button>
        <Button disabled>Disabled</Button>
      </div>
    </Card>
  );
}

function FormSection() {
  return (
    <Card title="Form controls">
      <div className="flex flex-col gap-4">
        <Field id="demo-email" label="E-mail" hint="We never show it to other riders.">
          <Input id="demo-email" type="email" placeholder="nusrat@dhakapool.test" />
        </Field>
        <Field id="demo-zone" label="Pickup" error="Please choose a zone from the list.">
          <Select id="demo-zone" aria-invalid="true" defaultValue="">
            <option value="">Choose…</option>
            <option value="BAN">Banani</option>
          </Select>
        </Field>
        <Toggle
          id="demo-share"
          label="Share my ride"
          hint="Save 20 % of the distance charge."
          defaultChecked
        />
      </div>
    </Card>
  );
}

function StatusSection() {
  return (
    <Card title="Status">
      <div className="flex flex-wrap gap-2">
        <RideStatusBadge status="REQUESTED" />
        <RideStatusBadge status="MATCHED" />
        <RideStatusBadge status="STARTED" />
        <RideStatusBadge status="COMPLETED" />
        <RideStatusBadge status="CANCELLED" />
        <Badge tone="warning">Women-only ride</Badge>
      </div>
      <div className="mt-4">
        <StatusStepper status="DRIVER_ARRIVED" />
      </div>
    </Card>
  );
}

function MoneySection() {
  return (
    <Card title="Money and seats">
      <p className="mb-3">
        Nusrat pays <MoneyText paisa={6600} /> when she shares Bullet.
      </p>
      <FareBreakdown title="Shared fare" fare={NUSRATS_SHARED_FARE} />
      <div className="mt-4">
        <SeatMeter occupied={2} capacity={3} />
      </div>
    </Card>
  );
}

export function StyleguideDemo() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <h1 className="text-3xl">UI kit</h1>
      <ButtonsSection onOpenDialog={() => setIsDialogOpen(true)} />
      <FormSection />
      <StatusSection />
      <MoneySection />
      <LoadingState label="Finding Teslas near Banani…" />
      <EmptyState title="No rides yet">Your past rides will appear here.</EmptyState>
      <ErrorState message="The service is temporarily unavailable." onRetry={() => undefined} />
      <ConfirmDialog
        open={isDialogOpen}
        title="Cancel this ride?"
        confirmLabel="Cancel and pay ৳20.00"
        onConfirm={() => setIsDialogOpen(false)}
        onClose={() => setIsDialogOpen(false)}
      >
        <p>Jashim has already arrived, so a ৳20.00 cancellation fee applies.</p>
      </ConfirmDialog>
    </main>
  );
}
