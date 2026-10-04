import { BASE_URL } from "../api/axios";
import { useRideStore } from "../store/rideStore";
import { useAuthStore } from "../store/authStore";
import { navigate, goBack, navigationRef } from "../navigation/navigationRef";
import { Alert } from "react-native";
import { Audio } from "expo-av";

let socket: WebSocket | null = null;
let reconnectDelay = 1000;
const maxReconnectDelay = 30000;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isExplicitDisconnect = false;

// Manage the ringtone globally
let currentSound: Audio.Sound | null = null;
let ringtoneTimeout: NodeJS.Timeout | null = null;
let playRequestId = 0;

async function playRingtone() {
  await stopRingtone();
  playRequestId++;
  const currentRequestId = playRequestId;
  
  try {
    console.log("Setting up ringtone audio mode...");
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    console.log("Playing trip request ringtone...");
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/trip_request_melodic.wav'),
      { isLooping: true }
    );
    
    // If stopRingtone was called while we were loading, abort playing!
    if (currentRequestId !== playRequestId) {
      await sound.unloadAsync();
      return;
    }

    currentSound = sound;
    await currentSound.playAsync();
    
    // Auto stop after 30 seconds
    ringtoneTimeout = setTimeout(() => {
      stopRingtone().catch(() => {});
    }, 30000);
  } catch (err) {
    console.log("Error playing WebSocket ringtone:", err);
  }
}

export async function stopRingtone() {
  playRequestId++; // Invalidate any loading sounds
  if (ringtoneTimeout) {
    clearTimeout(ringtoneTimeout);
    ringtoneTimeout = null;
  }
  if (currentSound) {
    const soundToStop = currentSound;
    currentSound = null;
    try {
      await soundToStop.stopAsync();
      await soundToStop.unloadAsync();
    } catch (e) {}
  }
}

export function connectDriverWebSocket(driverId: number, token: string) {
  // Only skip if socket is actively connecting or already open
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
  
  isExplicitDisconnect = false;

  // Build WebSocket URL robustly from BASE_URL
  // Strip trailing /api or /api/ to get the base host, then switch to wss://
  let baseHost = BASE_URL
    .replace(/\/api\/?$/, "")          // remove trailing /api
    .replace(/^https:\/\//, "wss://")  // https -> wss
    .replace(/^http:\/\//, "ws://");   // http -> ws
  
  // Safety check: if host starts with "." something went wrong, fallback to known WSS host
  if (baseHost.includes("://.") || !baseHost.startsWith("ws")) {
    baseHost = "ws://54.197.9.181";
  }
  
  const wsUrl = `${baseHost}/ws/driver/${driverId}?token=${token}`;

  console.log("Connecting driver WebSocket to:", wsUrl);

  socket = new WebSocket(wsUrl);

  let openTimer: NodeJS.Timeout | null = null;

  socket.onopen = () => {
    console.log("Driver WebSocket connection established");
    // Only reset reconnect delay if connection remains open stably for 5 seconds
    openTimer = setTimeout(() => {
      reconnectDelay = 1000;
    }, 5000);
    
    // Fetch pending rides and active ride automatically when connected
    useRideStore.getState().fetchIncomingRequests();
    useRideStore.getState().fetchActiveRide();
    
    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("WebSocket event received:", msg.type, msg);
      
      const { addIncomingRequest, removeIncomingRequest, setActiveRide } = useRideStore.getState();

      if (msg.type === "new_ride") {
        playRingtone();
        addIncomingRequest(msg.ride);
        // Popup modal request screen
        navigate("RideRequest", { rideId: msg.ride.id });
      } 
      else if (msg.type === "ride_accepted") {
        stopRingtone();
        const { incomingRequests } = useRideStore.getState();
        const wasInIncoming = incomingRequests.some(r => r.id === msg.ride_id);
        removeIncomingRequest(msg.ride_id);
        const currentDriverId = useAuthStore.getState().driver?.id;
        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
        
        if (msg.driver_id !== currentDriverId && (wasInIncoming || currentRoute === "RideRequest")) {
          Alert.alert("Ride Accepted", "This ride was accepted by another driver.");
          if (currentRoute === "RideRequest" && navigationRef.canGoBack()) {
            goBack();
          }
        }
      } 
      else if (msg.type === "ride_expired") {
        stopRingtone();
        removeIncomingRequest(msg.ride_id);
        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
        if (currentRoute === "RideRequest") {
          Alert.alert("Ride Expired", "The ride request has expired.");
          if (navigationRef.canGoBack()) goBack();
        }
      } 
      else if (msg.type === "ride_cancelled") {
        stopRingtone();
        const { incomingRequests } = useRideStore.getState();
        const wasInIncoming = incomingRequests.some(r => r.id === msg.ride_id);
        removeIncomingRequest(msg.ride_id);
        
        const activeRide = useRideStore.getState().activeRide;
        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
        
        if (activeRide && activeRide.id === msg.ride_id) {
          Alert.alert("Ride Cancelled", "The rider has cancelled the trip.");
          useRideStore.getState().setActiveRide(null);
          navigate("DriverDashboard");
        } else if (wasInIncoming || currentRoute === "RideRequest") {
          Alert.alert("Ride Cancelled", "The rider has cancelled this ride request.");
          if (currentRoute === "RideRequest" && navigationRef.canGoBack()) {
            goBack();
          }
        }
      }
      else if (msg.type === "ride_status_update") {
        const activeRide = useRideStore.getState().activeRide;
        if (activeRide && activeRide.id === msg.ride_id) {
          setActiveRide({ ...activeRide, status: msg.status });
        }
      }
      else if (msg.type === "destination_changed") {
        const activeRide = useRideStore.getState().activeRide;
        if (activeRide && activeRide.id === msg.ride.id) {
          Alert.alert("Destination Updated", "The rider has changed the destination. Route and fare have been updated.");
          setActiveRide(msg.ride);
        }
      }
      else if (msg.type === "driver_revoked") {
        const authStore = useAuthStore.getState();
        if (authStore.driver) {
          useAuthStore.setState({
            driver: {
              ...authStore.driver,
              is_approved: false,
              is_online: false
            }
          });
        }
        import('react-native').then(({ Alert }) => {
          Alert.alert(
            "Account Revoked",
            "Your account approval has been revoked by an administrator and you have been taken offline."
          );
        });
      }
    } catch (err) {
      console.log("Error parsing WS message:", err);
    }
  };

  socket.onclose = (event) => {
    console.log("Driver WebSocket connection closed:", event.reason);
    cleanupSocket();
    
    if (!isExplicitDisconnect) {
      scheduleReconnect(driverId, token);
    }
  };

  socket.onerror = (error) => {
    console.log("Driver WebSocket error:", error);
    socket?.close();
  };
}

export function disconnectDriverWebSocket() {
  isExplicitDisconnect = true;
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    try {
      socket.close();
    } catch (e) {}
  }
  cleanupSocket();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function cleanupSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (socket) {
    try {
      socket.close();
    } catch (err) {}
    socket = null;
  }
}

function scheduleReconnect(driverId: number, token: string) {
  if (reconnectTimer) return;

  const delay = reconnectDelay;
  reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
  console.log(`Reconnecting WebSocket in ${delay}ms`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectDriverWebSocket(driverId, token);
  }, delay);
}
