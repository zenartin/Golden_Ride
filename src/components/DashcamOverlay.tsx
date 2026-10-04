import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
  
  const cameraRef = useRef<CameraView>(null);
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

  if (!cameraPermission || !micPermission) {
    return <View />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera and Microphone permissions are required for Dashcam.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => { requestCameraPermission(); requestMicPermission(); }}>
          <Text style={styles.btnText}>Grant Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      cameraRef.current?.stopRecording();
    } else {
      if (!cameraRef.current) return;
      
      const recId = await RecordingService.startRecordingSession(rideId);
      if (!recId) {
        alert("Could not start recording session on server.");
        return;
      }
      setRecordingId(recId);
      setIsRecording(true);
      
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 60 * 60 });
        // When recording stops naturally or programmatically, upload it
        if (video?.uri) {
          await RecordingService.uploadRecording(recId, video.uri);
        }
      } catch (e) {
        console.error("Recording failed", e);
      }
    }
  };

  return (
    <View style={styles.overlay}>
      <CameraView style={styles.camera} facing={type} ref={cameraRef} mode="video">
        <View style={styles.topControls}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
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
          >
            <View style={isRecording ? styles.recordBtnSquare : styles.recordBtnCircle} />
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
