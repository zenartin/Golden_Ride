import React, { useEffect, useRef } from 'react';
import { Image,
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');

type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  OTP: undefined;
  KYC: undefined;
  Main: undefined;
};

type SplashScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export default function SplashScreen({ navigation }: Props) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const { loadUser } = useAuthStore();

  useEffect(() => {
    // Entry animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    const pulseTimeout = setTimeout(() => pulse.start(), 800);

    // Load user and navigate after 2.5s
    const navigate = async () => {
      setTimeout(() => {
        const { isAuthenticated: auth } = useAuthStore.getState();
        if (auth) {
          navigation.replace('Main');
        } else {
          navigation.replace('Welcome');
        }
      }, 2500);
    };
    navigate();

    return () => {
      clearTimeout(pulseTimeout);
      pulse.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Background glow */}
      <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]} />

      {/* Logo area */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image source={require("../../../assets/images/logo.jpeg")} style={{width: 120, height: 120, borderRadius: 60}} resizeMode="contain" />
      </Animated.View>

      {/* Brand name */}
      <Animated.Text style={[styles.brandName, { opacity: textOpacity }]}>
        Golden Ride
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Ride in Style
      </Animated.Text>

      {/* Dots loader */}
      <Animated.View style={[styles.dotsRow, { opacity: taglineOpacity }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotCenter]} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(245,184,0,0.06)',
    top: height / 2 - 200,
    alignSelf: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 80,
    elevation: 20,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
  },
  emojiWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(245,184,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 60,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: Spacing.xxxl,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(245,184,0,0.35)',
  },
  dotCenter: {
    backgroundColor: Colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
