import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { Colors, Typography } from '../../theme';
import { useRideStore } from '../../store/rideStore';

export default function AddressSearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { setPickup, setDropoff } = useRideStore();
  
  const type = route.params?.type || 'dropoff'; // 'pickup' or 'dropoff'

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=AIzaSyDbdW16zZqPVpdurydxr3VOXwHn3j85Dz4`);
      const data = await res.json();
      if (data.status === 'OK') {
        setResults(data.predictions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=AIzaSyDbdW16zZqPVpdurydxr3VOXwHn3j85Dz4`);
      const data = await res.json();
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        if (type === 'pickup') {
          setPickup(description, lat, lng);
        } else {
          setDropoff(description, lat, lng);
        }
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TextInput 
          style={styles.input}
          placeholder={`Enter ${type === 'pickup' ? 'pickup' : 'destination'}`}
          placeholderTextColor={Colors.textMuted}
          autoFocus
          value={query}
          onChangeText={searchPlaces}
        />
      </View>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item.place_id, item.description)}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📍</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.mainText} numberOfLines={1}>{item.structured_formatting?.main_text || item.description}</Text>
              <Text style={styles.subText} numberOfLines={1}>{item.structured_formatting?.secondary_text || ''}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 10, marginRight: 10 },
  backText: { color: Colors.textPrimary, fontSize: 24 },
  input: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 8, padding: 12, color: Colors.textPrimary, fontSize: Typography.body },
  resultItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  icon: { fontSize: 18 },
  textContainer: { flex: 1 },
  mainText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: '500', marginBottom: 4 },
  subText: { color: Colors.textSecondary, fontSize: Typography.small },
});
