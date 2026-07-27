import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../../types/navigation";
import { Colors } from "../../../theme";
import { PoweredByZenartin } from "../../../components/PoweredByZenartin";

type Props = NativeStackScreenProps<any, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => navigation.replace("Welcome"), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View
        style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <Image
          source={require("../../../../assets/images/logo.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity: fadeAnim }]}>
        <Text style={styles.brand}>Golden Ride</Text>
        <Text style={styles.tagline}>Drive. Earn. Grow.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <PoweredByZenartin />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 36,
  },
  textWrap: {
    alignItems: "center",
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
});
