import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ChatbotScreen from './screens/ChatbotScreen';
import FirstAidScreen from './screens/FirstAidScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import SymptomCheckerScreen from './screens/SymptomCheckerScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName = 'ellipse-outline';
            if (route.name === 'Chatbot') iconName = 'chatbubble-outline';
            if (route.name === 'Symptom Checker') iconName = 'pulse-outline';
            if (route.name === 'First Aid') iconName = 'medkit-outline';
            if (route.name === 'Emergency') iconName = 'call-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Chatbot" component={ChatbotScreen} />
        <Tab.Screen name="Symptom Checker" component={SymptomCheckerScreen} />
        <Tab.Screen name="First Aid" component={FirstAidScreen} />
        <Tab.Screen name="Emergency" component={EmergencyScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
