import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen';
import ProgressScreen from './screens/ProgressScreen';
import CommunityScreen from './screens/CommunityScreen';
import SettingsScreen from './screens/SettingsScreen';
import { Ionicons } from 'react-native-vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // Hide the top title bar
          tabBarStyle: {
            backgroundColor: '#1A1F23', // Change the bottom navigation bar background color
            borderTopWidth: 0, // Optional: Remove top border
          },
          tabBarActiveTintColor: '#05907A', // Color of the active tab icon
          tabBarInactiveTintColor: '#888', // Color of the inactive tab icon
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Analyze') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else if (route.name === 'Progress') {
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            } else if (route.name === 'Community') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Analyze" component={HomeScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>

    </NavigationContainer>
  );
}
