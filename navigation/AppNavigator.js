import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import all your screens
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import PostsScreen from '../screens/PostsScreen'; 
import PostDetailScreen from '../screens/PostDetailScreen'; 
import CreatePostScreen from '../screens/CreatePostScreen'; 
import SettingsScreen from '../screens/SettingsScreen';
import CameraScreen from '../screens/camera';
import SignIn from '../screens/SignIn';
import SignUp from '../screens/SignUp';
import PerformanceScreen from '../screens/PerformanceScreen';
import PerformanceComparisonScreen from '../screens/PerformanceComparisonScreen';
import ChatScreen from '../screens/ChatScreen';
import SearchFriendsScreen from '../screens/SearchFriendsScreen';
import NoConversationScreen from '../screens/NoConversationScreen';
import FindFriendScreen from '../screens/FindFriendScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs({ setIsLoggedIn }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1F23',
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#05907A',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Analyze') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Feed') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Analyze">
        {(props) => <HomeScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Community" component={PostsScreen} />
      <Tab.Screen name="Feed" component={PostsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ isLoggedIn, setIsLoggedIn }) {
  return (
    <Stack.Navigator>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
            {(props) => <MainTabs {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
          
          {/* Add new post-related screens */}
          <Stack.Screen 
            name="PostDetail" 
            component={PostDetailScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="CreatePost" 
            component={CreatePostScreen} 
            options={{ headerShown: false }}
          />

          {/* Existing screens */}
          <Stack.Screen 
            name="FindFriend" 
            component={FindFriendScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="SearchFriends" 
            component={SearchFriendsScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="NoConversation" 
            component={NoConversationScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CameraScreen"
            component={CameraScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Performance"
            component={PerformanceScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PerformanceComparisonScreen"
            component={PerformanceComparisonScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" options={{ headerShown: false }}>
            {(props) => <SignIn {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
          <Stack.Screen name="SignUp" options={{ headerShown: false }}>
            {(props) => <SignUp {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}