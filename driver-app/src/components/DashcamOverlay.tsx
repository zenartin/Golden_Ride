import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, Linking, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { RecordingService } from '../services/RecordingService';

interface Props {
  rideId: number | string;
  onClose: () => void;
}

export const DashcamOverlay: React.FC<Props> = ({ rideId, onClose }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [type, setType] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const finishPromiseRef = useRef<Promise<void> | null>(null);
  const isRecordingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Stop the camera cleanly if the screen goes away mid-recording
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        try { cameraRef.current?.stopRecording(); } catch (e) {}
      }
    };
  }, []);

  const askPermissions = async () => {
    const cam = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    const mic = micPermission?.granted ? micPermission : await requestMicPermission();
    if (!cam?.granted || !mic?.granted) {
      Alert.alert(
        'Permission needed',
        'Allow camera and microphone access in Settings to record your ride.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    }
  };

  if (!cameraPermission || !micPermission) {
    return <View style={styles.container}><ActivityIndicator color="#fff" /></View>;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera and Microphone permissions are required for Dashcam.</Text>
        <TouchableOpacity style={styles.btn} onPress={askPermissions}>
          <Text style={styles.btnText}>Grant Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleClose = async () => {
    if (isRecording) {
      setIsRecording(false);
      try { cameraRef.current?.stopRecording(); } catch (e) {}
      // wait for the recording to finish & upload before unmounting the camera
      if (finishPromiseRef.current) await finishPromiseRef.current.catch(() => {});
    }
    onClose();
  };

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleRecord = async () => {
    if (starting || uploading) return;
    if (isRecording) {
      setIsRecording(false);
      try { cameraRef.current?.stopRecording(); } catch (e) {}
      return;
    }
    if (!cameraRef.current) return;

    setStarting(true);
    const recId = await RecordingService.startRecordingSession(rideId);
    setStarting(false);
    if (!recId) {
      Alert.alert('Could not start recording', 'Please check your connection and try again.');
      return;
    }
    setRecordingId(recId);
    setIsRecording(true);

    finishPromiseRef.current = (async () => {
      try {
        const video = await cameraRef.current!.recordAsync({ maxDuration: 60 * 60 });
        setIsRecording(false);
        if (video?.uri) {
          setUploading(true);
          const ok = await RecordingService.uploadRecording(recId, video.uri);
          setUploading(false);
          if (ok) Alert.alert('Ride recording saved', 'Your recording was uploaded securely. It is kept for 24 hours.');
          else Alert.alert('Upload failed', 'The recording is saved on your phone. Please try again with a better connection.');
        }
      } catch (e) {
        console.error('Recording failed', e);
        setIsRecording(false);
        setUploading(false);
        Alert.alert('Recording failed', 'Video recording stopped unexpectedly. Please try again.');
      }
    })();
  };

  return (
    <View style={styles.overlay}>
      <CameraView style={styles.camera} facing={type} ref={cameraRef} mode="video">
        <View style={styles.topControls}>
          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {isRecording && (
            <View style={styles.recIndicator}>
              <Animated.View style={[styles.redDot, { opacity: pulseAnim }]} />
              <Text style={styles.recText}>REC</Text>
            </View>
          )}
          <TouchableOpacity onPress={toggleCameraType} style={styles.iconBtn}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={[styles.recordBtn, isRecording && styles.recordingActive]} 
            onPress={handleRecord}
            disabled={starting || uploading}
          >
            {starting || uploading
              ? <ActivityIndicator color="#fff" />
              : <View style={isRecording ? styles.recordBtnSquare : styles.recordBtnCircle} />}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'black'
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  bottomControls: {
    paddingBottom: 40,
    alignItems: 'center'
  },
  iconBtn: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30
  },
  recIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginRight: 6
  },
  recText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  recordBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  recordingActive: {
    borderColor: 'red'
  },
  recordBtnCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff'
  },
  recordBtnSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'red'
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16
  },
  btn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  btnSecondary: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  btnText: {
    fontWeight: 'bold',
    color: '#000'
  }
});
