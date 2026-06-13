import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { GymMachine } from '../types';

const STORAGE_KEY = 'gym_machines';

// Think of this hook like an Angular service — it owns the data layer.
// Any component that calls useMachineStore() gets the same shared state
// and the same save/update functions.

export function useMachineStore() {
  const [machines, setMachines] = useState<Record<string, GymMachine>>({});
  const [loading, setLoading] = useState(true);

  // Load all machines from device storage on first use
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setMachines(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to load machines from storage', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist the full machines map whenever it changes
  const persist = useCallback(async (updated: Record<string, GymMachine>) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setMachines(updated);
  }, []);

  // Called when a QR code is scanned — upserts the machine record
  const upsertMachine = useCallback(async (machine: GymMachine) => {
    const updated = { ...machines, [machine.id]: machine };
    await persist(updated);
  }, [machines, persist]);

  // Called when user taps +5 or -5
  const updateWeight = useCallback(async (machineId: string, delta: number) => {
    const existing = machines[machineId];
    if (!existing) return;
    const newWeight = Math.max(0, existing.workingWeight + delta);
    const updated = {
      ...machines,
      [machineId]: { ...existing, workingWeight: newWeight },
    };
    await persist(updated);
  }, [machines, persist]);

  const getMachine = useCallback(
    (machineId: string): GymMachine | undefined => machines[machineId],
    [machines]
  );

  return { machines, loading, upsertMachine, updateWeight, getMachine };
}
