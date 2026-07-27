import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Minimum time (ms) the GIF splash will show — adjust to match your GIF length
const GIF_DURATION_MS = 3000;

interface Props {
  onFinish?: () => void;
}

export default function GifSplashScreen({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Fade out the splash after GIF_DURATION_MS
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }, GIF_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Image
        source={require("../../assets/intro.gif")}
        style={styles.gif}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 9999,
    backgroundColor: "#000",
  },
  gif: {
    width: "100%",
    height: "100%",
  },
});
