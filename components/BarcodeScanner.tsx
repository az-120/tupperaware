import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Colors } from "../constants/colors";

interface BarcodeScannerProps {
  onScanned: (barcode: string) => void;
}

export function BarcodeScanner({ onScanned }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.denied}>
        <Text style={styles.deniedText}>Camera access is required to scan barcodes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcode = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.target} />
      </View>
      {scanned && (
        <View style={styles.rescanRow}>
          <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
            <Text style={styles.rescanText}>Tap to scan again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 12,
  },
  denied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.surface,
  },
  deniedText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  permBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  target: {
    width: 220,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  rescanRow: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  rescanBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rescanText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
