import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export const PoweredByZenartin = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.poweredText}>Powered by</Text>
      <Image 
        source={require('./zenartin-logo.png')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  poweredText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  logo: {
    width: 180,
    height: 60,
  }
});
