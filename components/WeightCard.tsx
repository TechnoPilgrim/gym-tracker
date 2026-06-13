import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MachineDisplay } from '../types';

interface Props {
  machine: MachineDisplay;
  onIncrement: () => void;
  onDecrement: () => void;
}

// This component is "dumb" — it just displays what it receives and fires
// callbacks when buttons are pressed. Think of it like an Angular presentational
// component with @Input() and @Output() EventEmitters.

export function WeightCard({ machine, onIncrement, onDecrement }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.machineName}>{machine.name}</Text>

      <View style={styles.weightRow}>
        <TouchableOpacity style={styles.button} onPress={onDecrement}>
          <Text style={styles.buttonText}>−5</Text>
        </TouchableOpacity>

        <View style={styles.weightDisplay}>
          <Text style={styles.weightLabel}>Working Weight</Text>
          <Text style={styles.weightValue}>{machine.workingWeight} lbs</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={onIncrement}>
          <Text style={styles.buttonText}>+5</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warmupRow}>
        <Text style={styles.warmupLabel}>Warm-up Weight (70%)</Text>
        <Text style={styles.warmupValue}>{machine.warmupWeight} lbs</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  machineName: {
    color: '#cdd6f4',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#89b4fa',
    borderRadius: 12,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1e1e2e',
    fontSize: 22,
    fontWeight: '800',
  },
  weightDisplay: {
    alignItems: 'center',
  },
  weightLabel: {
    color: '#a6adc8',
    fontSize: 13,
    marginBottom: 4,
  },
  weightValue: {
    color: '#cdd6f4',
    fontSize: 40,
    fontWeight: '800',
  },
  warmupRow: {
    backgroundColor: '#313244',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  warmupLabel: {
    color: '#a6adc8',
    fontSize: 13,
    marginBottom: 4,
  },
  warmupValue: {
    color: '#a6e3a1',
    fontSize: 28,
    fontWeight: '700',
  },
});
