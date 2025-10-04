import type { CameraMountError } from "expo-camera";
import { Camera, CameraView } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PermissionState = "unknown" | "granted" | "denied";

const isMobile = Platform.OS === "ios" || Platform.OS === "android";

export default function App() {
  const [permission, setPermission] = useState<PermissionState>(
    isMobile ? "unknown" : "denied"
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true); // 👈 domyślnie true

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const torchStateRef = useRef(flashlightOn);

  useEffect(() => {
    torchStateRef.current = flashlightOn;
  }, [flashlightOn]);

  // sprawdzanie permission
  useEffect(() => {
    if (!isMobile) return;
    let mounted = true;

    const ensurePermission = async () => {
      try {
        const current = await Camera.getCameraPermissionsAsync();
        if (!mounted) return;

        if (current.status === "granted") {
          setPermission("granted");
          return;
        }

        if (current.canAskAgain) {
          const requested = await Camera.requestCameraPermissionsAsync();
          if (!mounted) return;
          if (requested.status === "granted") {
            setPermission("granted");
            return;
          }
        }

        setPermission("denied");
        setMessage("Camera permission is required to control the flashlight.");
      } catch {
        if (mounted) {
          setPermission("denied");
          setMessage("Could not read camera permission state.");
        }
      }
    };

    ensurePermission();
    return () => {
      mounted = false;
    };
  }, []);

  // reset torch przy background
  useEffect(() => {
    if (!isMobile) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;

      if (previous === "active" && nextState.match(/inactive|background/)) {
        if (torchStateRef.current) {
          torchStateRef.current = false;
          setFlashlightOn(false);
        }
      }

      if (nextState === "active") {
        Camera.getCameraPermissionsAsync()
          .then(({ status }) => {
            setPermission(status === "granted" ? "granted" : "denied");
          })
          .catch(() => undefined);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (permission !== "granted" && flashlightOn) {
      setFlashlightOn(false);
    }
  }, [permission, flashlightOn]);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === "granted";
      setPermission(granted ? "granted" : "denied");
      if (!granted) {
        setMessage("Camera access is required to control the flashlight.");
      }
      return granted;
    } catch {
      setPermission("denied");
      setMessage("Unable to request camera permission.");
      return false;
    }
  }, []);

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setMessage(null);
  }, []);

  const handleCameraError = useCallback((error: CameraMountError) => {
    setCameraReady(false);
    setCameraAvailable(false);
    setFlashlightOn(false);
    setMessage(error?.message ?? "Unknown camera error.");
  }, []);

  const toggleFlashlight = useCallback(async () => {
    if (!isMobile) {
      Alert.alert(
        "Not supported",
        "Flashlight control is only available on Android or iOS devices."
      );
      return;
    }

    if (permission !== "granted") {
      const grantedNow = await requestPermission();
      if (!grantedNow) {
        Alert.alert(
          "Permission needed",
          "Enable camera access in system settings to use the flashlight.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    if (!cameraAvailable) {
      Alert.alert("Camera unavailable", "Torch control is not available.");
      return;
    }

    if (!cameraReady) {
      setMessage("Camera is still starting. Try again in a moment.");
      return;
    }

    setMessage(null);
    setFlashlightOn((current) => !current);
  }, [cameraReady, cameraAvailable, permission, requestPermission]);

  const statusText = useMemo(() => {
    if (!isMobile) return "Flashlight works only on Android/iOS devices.";
    if (permission === "unknown") return "Checking camera permission...";
    if (permission === "denied") return "Grant camera permission.";
    if (!cameraAvailable) return "Camera unavailable.";
    if (!cameraReady) return "Starting camera session...";
    return flashlightOn ? "Flashlight is ON." : "Flashlight is OFF.";
  }, [cameraAvailable, cameraReady, flashlightOn, permission]);

  return (
    <View style={[styles.container, flashlightOn && styles.containerActive]}>
      <StatusBar style={flashlightOn ? "light" : "dark"} />

      {permission === "granted" ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashlightOn}
          onCameraReady={handleCameraReady}
          onMountError={handleCameraError}
        />
      ) : null}

      <Text style={[styles.title, flashlightOn && styles.titleActive]}>
        Flashlight control
      </Text>
      <Text style={[styles.status, flashlightOn && styles.statusActive]}>
        {statusText}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          flashlightOn && styles.buttonActive,
          (permission !== "granted" || !cameraAvailable || !isMobile) &&
            styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={toggleFlashlight}
        disabled={permission !== "granted" || !cameraAvailable || !isMobile}
      >
        <Text
          style={[styles.buttonLabel, flashlightOn && styles.buttonLabelActive]}
        >
          {flashlightOn ? "Turn flashlight off" : "Turn flashlight on"}
        </Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.hints}>
        <Text style={styles.hintsTitle}>Tips</Text>
        <Text style={styles.hintItem}>
          - Works only on real devices, not in a simulator/emulator.
        </Text>
        <Text style={styles.hintItem}>
          - Torch turns off automatically when app goes to background.
        </Text>
        <Text style={styles.hintItem}>
          - If the light does not turn on, check if another app is using it.
        </Text>
        <Text style={styles.hintItem}>
          - On MIUI/custom ROMs enable flashlight access in system settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  containerActive: {
    backgroundColor: "#101114",
  },
  camera: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01, // 👈 hack na MIUI, nie 0!
    left: -9999, // ukryty poza ekranem
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  titleActive: {
    color: "#f9fafb",
  },
  status: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginBottom: 32,
  },
  statusActive: {
    color: "#e5e7eb",
  },
  button: {
    minWidth: 220,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#111827",
    marginBottom: 24,
  },
  buttonActive: {
    backgroundColor: "#f9fafb",
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  buttonLabel: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#f9fafb",
  },
  buttonLabelActive: {
    color: "#111827",
  },
  message: {
    color: "#dc2626",
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 24,
  },
  hints: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    padding: 16,
  },
  hintsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  hintItem: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
});
