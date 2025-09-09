import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firstAidData from '../data/firstAidTips'; // JS data file

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FirstAidScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const handleToggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredData = firstAidData.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const isExpanded = item.id === expandedId;
    return (
      <TouchableOpacity
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.9}
        style={[styles.card, isExpanded && styles.cardExpanded]}
      >
        <Text style={styles.title}>{item.title}</Text>
        {isExpanded && (
          <View style={styles.steps}>
            {item.steps.map((step, index) => (
              <Text key={index} style={styles.stepText}>
                • {step}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TextInput
          placeholder="Search First Aid..."
          placeholderTextColor="#999"
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12, // extra top padding for breathing room
  },
  searchBar: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardExpanded: {
    backgroundColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  steps: {
    marginTop: 10,
  },
  stepText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 6,
    paddingLeft: 6,
  },
});

export default FirstAidScreen;
