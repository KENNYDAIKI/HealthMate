import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ChatbotScreen from './screens/ChatbotScreen';
import FirstAidScreen from './screens/FirstAidScreen';
import EmergencyScreen from './screens/EmergencyScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === 'Chatbot') {
              iconName = 'chatbubble-outline';
            } else if (route.name === 'First Aid') {
              iconName = 'medkit-outline';
            } else if (route.name === 'Emergency') {
              iconName = 'call-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Chatbot" component={ChatbotScreen} />
        <Tab.Screen name="First Aid" component={FirstAidScreen} />
        <Tab.Screen name="Emergency" component={EmergencyScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
