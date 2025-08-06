import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet, Alert } from 'react-native';
import emergencyContacts from '../data/emergencyContacts';

const EmergencyScreen = () => {
  const callNumber = async (phone) => {
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to make a phone call');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => callNumber(item.phone)}
      activeOpacity={0.8}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.phone}>{item.phone}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={emergencyContacts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  card: {
    backgroundColor: '#f2f2f2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  phone: {
    fontSize: 16,
    color: '#555',
    marginTop: 4,
  },
});

export default EmergencyScreen;
