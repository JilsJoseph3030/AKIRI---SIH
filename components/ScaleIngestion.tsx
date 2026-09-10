import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  NativeEventEmitter, 
  NativeModules 
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { CPCBYieldEngine, validateDensityAndCompleteness, MaterialCategory } from '../lib/cpcb-engine';
import { saveTransactionLocally } from '../db/offline-sqlite';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// Constants for ESP32 BLE
const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const ESP32_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export interface ScaleIngestionProps {
  collectorAliasCode: string;
  materialCategory: MaterialCategory;
  baseRatePerKg: number;
  estimatedVolumeWeight: number; // Used for density anomaly check against actual weight
  visualCompletenessScore: number; // e.g., 0.8 for 80% complete
  onTransactionSaved: () => void;
}

export const ScaleIngestion: React.FC<ScaleIngestionProps> = ({
  collectorAliasCode,
  materialCategory,
  baseRatePerKg,
  estimatedVolumeWeight,
  visualCompletenessScore,
  onTransactionSaved
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [scaleWeightKg, setScaleWeightKg] = useState<number>(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    BleManager.start({ showAlert: false });

    // Handle discovery of the ESP32 smart scale
    const handleDiscoverPeripheral = (peripheral: any) => {
      if (peripheral.name === 'Akiri_Scale' || peripheral.name === 'ESP32_Scale') {
        setDeviceId(peripheral.id);
        BleManager.stopScan();
      }
    };

    const handleStopScan = () => {
      setIsScanning(false);
      if (deviceId) {
        connectToScale(deviceId);
      } else {
        Alert.alert("Scale Not Found", "Could not find the ESP32 smart scale. Please try again.");
      }
    };

    // Parse bytes received from the ESP32 characteristic into a float weight
    const handleUpdateValueForCharacteristic = (data: any) => {
      if (data.value && Array.isArray(data.value)) {
        // Assume data.value is an array of ASCII character codes (e.g., "12.50")
        const weightString = String.fromCharCode(...data.value);
        const weight = parseFloat(weightString);
        if (!isNaN(weight)) {
          setScaleWeightKg(weight);
        }
      }
    };

    const discoverSub = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    const stopScanSub = bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    const updateSub = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);

    return () => {
      discoverSub.remove();
      stopScanSub.remove();
      updateSub.remove();
      if (deviceId) {
        BleManager.disconnect(deviceId);
      }
    };
  }, [deviceId]);

  const connectToScale = async (id: string) => {
    try {
      await BleManager.connect(id);
      setIsConnected(true);
      await BleManager.retrieveServices(id);
      await BleManager.startNotification(id, ESP32_SERVICE_UUID, ESP32_CHARACTERISTIC_UUID);
    } catch (error) {
      console.error("Connection error", error);
      Alert.alert("Connection Error", "Failed to connect to the smart scale.");
      setIsConnected(false);
    }
  };

  const startScan = () => {
    if (!isScanning) {
      setDeviceId(null);
      setIsScanning(true);
      // Scan for 5 seconds
      BleManager.scan([], 5, true).catch(err => console.error("Scan error", err));
    }
  };

  const processTransaction = () => {
    if (scaleWeightKg <= 0) {
      Alert.alert("Invalid Weight", "Please wait for a valid weight reading from the scale.");
      return;
    }

    // 1. Validation & Anti-Fraud
    const validation = validateDensityAndCompleteness(
      scaleWeightKg, 
      estimatedVolumeWeight, 
      visualCompletenessScore, 
      baseRatePerKg
    );

    if (validation.densityAnomalyFlag) {
      Alert.alert(
        "⚠️ Contamination Flagged", 
        "Density anomaly detected! The physical weight is unnaturally high for this volume. Possible hidden lead/sand. Proceed with caution."
      );
    }

    // 2. Yield Calculation (CPCB Mass-Balance)
    const yieldResult = CPCBYieldEngine.calculateYield(materialCategory, scaleWeightKg);

    // 3. Save Offline
    const transactionId = Math.random().toString(36).substring(2, 15);
    
    saveTransactionLocally({
      id: transactionId,
      collector_alias_code: collectorAliasCode,
      material_category: materialCategory,
      raw_weight_kg: scaleWeightKg,
      completeness_index: visualCompletenessScore,
      density_anomaly_flag: validation.densityAnomalyFlag,
      final_payout_amt: validation.finalPayoutAmt,
      status: 'PENDING'
    });

    Alert.alert(
      "Transaction Saved", 
      `Final Payout: ₹${validation.finalPayoutAmt}\nCopper Yield: ${yieldResult.recoveredCopperKg}kg\nStatus: Pending Sync`,
      [{ text: "OK", onPress: onTransactionSaved }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Network / Connection Status Indicator */}
      <View style={styles.header}>
        <View style={[styles.statusIndicator, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
        <Text style={styles.statusText}>{isConnected ? 'Scale Connected' : 'Scale Disconnected'}</Text>
      </View>

      {/* Main Weight Display (Large, High-Contrast Typography for Low-Literacy Usability) */}
      <View style={styles.weightDisplay}>
        <Text style={styles.weightLabel}>Live Scale Weight</Text>
        <Text style={styles.weightValue}>
          {scaleWeightKg.toFixed(2)} <Text style={styles.weightUnit}>kg</Text>
        </Text>
        {isScanning && <Text style={styles.scanningText}>Scanning for ESP32 scale...</Text>}
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.scanButton, isScanning && styles.buttonDisabled]} 
        onPress={startScan}
        disabled={isScanning || isConnected}
      >
        <Text style={styles.buttonText}>{isScanning ? 'Scanning...' : 'Pair Bluetooth Scale'}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.processButton, (!isConnected || scaleWeightKg <= 0) && styles.buttonDisabled]} 
        onPress={processTransaction}
        disabled={!isConnected || scaleWeightKg <= 0}
      >
        <Text style={styles.buttonText}>Process Transaction</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#121212', // High-contrast dark mode base
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#1E1E1E',
    padding: 14,
    borderRadius: 8,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  statusConnected: {
    backgroundColor: '#00E676', // Bright Green
  },
  statusDisconnected: {
    backgroundColor: '#FF3D00', // Bright Red
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weightDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#333333',
  },
  weightLabel: {
    color: '#888888',
    fontSize: 22,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  weightValue: {
    color: '#00E676',
    fontSize: 84, // Extremely large for low-literacy clarity
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: 36,
    color: '#00E676',
    fontWeight: 'normal',
  },
  scanningText: {
    color: '#BBBBBB',
    marginTop: 16,
    fontSize: 16,
  },
  button: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#2962FF',
  },
  processButton: {
    backgroundColor: '#00C853',
  },
  buttonDisabled: {
    backgroundColor: '#424242',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  }
});
