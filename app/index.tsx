import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMachineStore } from '../hooks/useMachineStore';
import { parseMatrixQR, fetchMachineName } from '../hooks/parseMatrixQR';
import { WeightCard } from '../components/WeightCard';
import { GymMachine, MachineDisplay } from '../types';

type AppState =
  | { screen: 'home' }
  | { screen: 'scanning' }
  | { screen: 'naming'; machineId: string; suggestedName: string }
  | { screen: 'loading' };

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [appState, setAppState] = useState<AppState>({ screen: 'home' });
  const [activeMachineId, setActiveMachineId] = useState<string | null>(null);
  const [editableName, setEditableName] = useState('');
  // The camera reports the same QR code many times per second. This lock makes
  // sure only the first report is handled; it's reset each time scanning starts.
  const scanLock = useRef(false);

  const { getMachine, upsertMachine, updateWeight, loading } = useMachineStore();

  // Derive display object (adds warmupWeight) — computed, never stored
  const activeMachine: MachineDisplay | null = (() => {
    if (!activeMachineId) return null;
    const m = getMachine(activeMachineId);
    if (!m) return null;
    return { ...m, warmupWeight: Math.round(m.workingWeight * 0.7) };
  })();

  // ── Called by camera when QR is detected ──────────────────────────────────
  function startScanning() {
    scanLock.current = false;
    setAppState({ screen: 'scanning' });
  }

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanLock.current) return;
    scanLock.current = true;
    setAppState({ screen: 'loading' });

    const parsed = parseMatrixQR(data);
    if (!parsed) {
      // Show what was actually scanned, so a future failure explains itself
      Alert.alert(
        'Unrecognized QR Code',
        `This doesn't look like a machine video link.\n\nIt contains:\n${data.slice(0, 200)}`,
        [{ text: 'OK', onPress: () => setAppState({ screen: 'home' }) }]
      );
      return;
    }

    // Already seen this machine — just surface it, no lookup needed
    const existing = getMachine(parsed.machineId);
    if (existing) {
      setActiveMachineId(parsed.machineId);
      setAppState({ screen: 'home' });
      return;
    }

    // New machine — look up its name from the video title (YouTube or Vimeo)
    const suggestedName = (await fetchMachineName(parsed)) ?? '';

    // Show confirmation screen so user can correct the name if needed
    setEditableName(suggestedName);
    setAppState({ screen: 'naming', machineId: parsed.machineId, suggestedName });
  }

  // ── Called when user confirms the machine name ────────────────────────────
  async function handleConfirmName(machineId: string) {
    const newMachine: GymMachine = {
      id: machineId,
      name: editableName.trim() || `Machine ${machineId}`,
      workingWeight: 45, // Sensible starting point (empty Olympic bar)
    };
    await upsertMachine(newMachine);
    setActiveMachineId(machineId);
    setAppState({ screen: 'home' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#89b4fa" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // ── Loading screen (YouTube API in flight) ────────────────────────────────
  if (appState.screen === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.appTitle}>💪 Gym Weight Tracker</Text>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#89b4fa" />
          <Text style={styles.loadingText}>Looking up machine name…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Name confirmation screen (new machine only) ───────────────────────────
  if (appState.screen === 'naming') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.appTitle}>💪 Gym Weight Tracker</Text>
        <View style={styles.namingCard}>
          <Text style={styles.namingTitle}>New Machine Found</Text>
          <Text style={styles.namingSubtitle}>
            {appState.suggestedName
              ? 'Confirm or edit the machine name:'
              : "Couldn't look up the name (no signal?). Please type it in:"}
          </Text>
          <TextInput
            style={styles.nameInput}
            value={editableName}
            onChangeText={setEditableName}
            placeholder="e.g. Ultra / Leg Press"
            placeholderTextColor="#6c7086"
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => handleConfirmName(appState.machineId)}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleConfirmName(appState.machineId)}
          >
            <Text style={styles.primaryButtonText}>✓ Confirm Name</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setAppState({ screen: 'home' })}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Scanner screen ────────────────────────────────────────────────────────
  if (appState.screen === 'scanning') {
    return (
      <SafeAreaView style={styles.container}>
        {permission?.granted ? (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <View style={styles.scanOverlay}>
              <Text style={styles.scanHint}>Point at a Matrix machine QR code</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAppState({ screen: 'home' })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.permissionText}>
              Camera access is needed to scan QR codes.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Home screen ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appTitle}>💪 Gym Weight Tracker</Text>

      {activeMachine ? (
        <WeightCard
          machine={activeMachine}
          onIncrement={() => updateWeight(activeMachine.id, 5)}
          onDecrement={() => updateWeight(activeMachine.id, -5)}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyStateText}>
            Scan a Matrix machine QR code to get started.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={startScanning}
      >
        <Text style={styles.primaryButtonText}>
          {activeMachine ? '📷  Scan Another Machine' : '📷  Scan QR Code'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#181825', alignItems: 'center' },
  appTitle:          { color: '#cdd6f4', fontSize: 26, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  centered:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 20 },
  loadingText:       { color: '#a6adc8', fontSize: 16, marginTop: 16 },
  emptyStateText:    { color: '#a6adc8', fontSize: 17, textAlign: 'center', lineHeight: 26 },
  camera:            { flex: 1, width: '100%' },
  scanOverlay:       { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 48, gap: 16 },
  scanHint:          { color: '#cdd6f4', fontSize: 15, backgroundColor: '#00000088', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelButton:      { backgroundColor: '#f38ba8', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  cancelButtonText:  { color: '#1e1e2e', fontSize: 17, fontWeight: '700' },
  primaryButton:     { backgroundColor: '#89b4fa', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 32, marginTop: 8 },
  primaryButtonText: { color: '#1e1e2e', fontSize: 17, fontWeight: '700' },
  secondaryButton:   { paddingVertical: 12 },
  secondaryButtonText: { color: '#a6adc8', fontSize: 15 },
  permissionText:    { color: '#a6adc8', fontSize: 16, textAlign: 'center' },
  namingCard:        { flex: 1, width: '100%', paddingHorizontal: 24, paddingTop: 32, gap: 16 },
  namingTitle:       { color: '#cdd6f4', fontSize: 22, fontWeight: '700' },
  namingSubtitle:    { color: '#a6adc8', fontSize: 15 },
  nameInput: {
    backgroundColor: '#313244',
    color: '#cdd6f4',
    fontSize: 18,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#89b4fa',
  },
});
