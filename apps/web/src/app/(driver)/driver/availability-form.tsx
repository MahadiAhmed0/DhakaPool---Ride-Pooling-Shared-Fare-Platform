'use client';
// Going online in a zone, moving to another zone, or going offline (FR-DRV-02). While a trip is
// under way none of this may change (FR-DRV-03), so the controls are locked with the reason shown.
import type { AvailabilityChange, DriverStatus, Zone } from '@dhakapool/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Field, Select } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';
import { Toggle } from '@/components/ui/toggle';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

const LOCKED_HINT = 'Finish or cancel your trip before going offline or changing zone.';
const ONLINE_HINT = 'Online drivers see waiting requests in their zone.';

// The chosen zone and the two things a driver can do: pick a zone, or switch online/offline.
function useAvailability(driver: DriverStatus) {
  const queryClient = useQueryClient();
  const [zoneCode, setZoneCode] = useState(driver.zoneCode ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: (body: AvailabilityChange) => api.put('/driver/availability', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.driver }),
  });
  const isOnline = driver.availability === 'ONLINE';

  function goOnline(zone: string) {
    if (zone === '') {
      setProblem('Choose the zone you are in first.');
      return;
    }
    setProblem(null);
    change.mutate({ availability: 'ONLINE', zoneCode: zone });
  }

  function chooseZone(zone: string) {
    setZoneCode(zone);
    if (isOnline) {
      goOnline(zone);
    }
  }

  function switchOnline(wantsOnline: boolean) {
    if (wantsOnline) {
      goOnline(zoneCode);
      return;
    }
    change.mutate({ availability: 'OFFLINE' });
  }

  return { zoneCode, problem, change, isOnline, chooseZone, switchOnline };
}

type ZoneSelectProps = {
  zones: Zone[];
  value: string;
  disabled: boolean;
  problem: string | null;
  onChange: (zone: string) => void;
};

function ZoneSelect({ zones, value, disabled, problem, onChange }: ZoneSelectProps) {
  return (
    <Field id="zoneCode" label="Your zone" error={problem ?? undefined}>
      <Select
        id="zoneCode"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose a zone…</option>
        {zones.map((zone) => (
          <option key={zone.code} value={zone.code}>
            {zone.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function AvailabilityForm({ driver, zones }: { driver: DriverStatus; zones: Zone[] }) {
  const availability = useAvailability(driver);
  const { change } = availability;
  const isLocked = driver.activePool !== null || change.isPending;
  return (
    <div className="flex flex-col gap-4">
      {change.isError ? <ErrorState message={change.error.message} /> : null}
      <ZoneSelect
        zones={zones}
        value={availability.zoneCode}
        disabled={isLocked}
        problem={availability.problem}
        onChange={availability.chooseZone}
      />
      <Toggle
        id="isOnline"
        label="Online"
        hint={driver.activePool ? LOCKED_HINT : ONLINE_HINT}
        checked={availability.isOnline}
        disabled={isLocked}
        onChange={(event) => availability.switchOnline(event.target.checked)}
      />
    </div>
  );
}
