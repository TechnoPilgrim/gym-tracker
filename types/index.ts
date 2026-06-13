// A single gym machine record stored on the device
export interface GymMachine {
  id: string;          // Extracted from QR code URL — stable unique key
  name: string;        // Human-readable machine name e.g. "Leg Press"
  workingWeight: number; // In lbs, editable in +/- 5 increments
}

// Derived at display time — never stored
export interface MachineDisplay extends GymMachine {
  warmupWeight: number;  // workingWeight * 0.70, read-only
}
