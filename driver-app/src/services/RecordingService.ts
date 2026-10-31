import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { BASE_URL } from '../api/axios';
import { useAuthStore } from '../store/authStore';

export class RecordingService {
  static async startRecordingSession(rideId: number | string): Promise<number | null> {
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post(`${BASE_URL}/recordings/start?ride_id=${rideId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.recording_id;
    } catch (e) {
      console.error('Failed to start recording session:', e);
      return null;
    }
  }

  static async uploadRecording(recordingId: number, fileUri: string): Promise<boolean> {
    try {
      const token = useAuthStore.getState().token;
      
      const formData = new FormData();
      formData.append('recording_id', recordingId.toString());
      
      // Determine extension and mime type from uri
      const filename = fileUri.split('/').pop() || 'video.mp4';
      const type = filename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
      
      formData.append('video', {
        uri: fileUri,
        name: filename,
        type: type,
      } as any);

      await axios.post(`${BASE_URL}/recordings/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        transformRequest: (data: any) => data,
        timeout: 120000,
        maxBodyLength: Infinity,
      });
      
      // Attempt to delete local file after successful upload to free space
      await this.deleteLocalFile(fileUri);
      
      return true;
    } catch (e) {
      console.error('Failed to upload recording:', e);
      return false;
    }
  }

  static async deleteLocalFile(fileUri: string) {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch (e) {
      console.error('Failed to delete local video:', e);
    }
  }
}
