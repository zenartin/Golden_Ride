import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useRegistration } from "./RegistrationContext";

const AddressScreen = ({ navigation }: any) => {
  const { update } = useRegistration();

  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  return (
    <View style={{ padding: 20 }}>
      <Text>Address Info</Text>

      <TextInput placeholder="Address" onChangeText={(t) => setForm({ ...form, address: t })} />
      <TextInput placeholder="City" onChangeText={(t) => setForm({ ...form, city: t })} />
      <TextInput placeholder="State" onChangeText={(t) => setForm({ ...form, state: t })} />
      <TextInput placeholder="Pincode" onChangeText={(t) => setForm({ ...form, pincode: t })} />

      <TouchableOpacity
        onPress={() => {
          update("address", form);
          navigation.navigate("License");
        }}
      >
        <Text>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddressScreen;
