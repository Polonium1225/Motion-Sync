// React is used implicitly for JSX
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


// Import all your screens
import HomeScreen from '../screens/HomeScreen';
import test from '../screens/test';
import CommunityScreen from '../screens/CommunityScreen';
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
import image_analyser3d from '../screens/image_analyser3d';
import aichatscreen from '../screens/aichatscreen'
import BadgesAndMilestonesScreen from '../screens/BadgesAndMilestonesScreen'
import GymFinder from '../screens/GymFinder'
import image3dplot from '../screens/image3dplot'
import DemoSessionScreen from '../screens/DemoSessionScreen';
import UserProfileScreen from '../screens/UserProfileScreen';


import UpdatedPoseEstimationSelectionScreen from '../screens/UpdatedPoseEstimationSelectionScreen';


import FormCorrectionModeScreen from '../screens/FormCorrectionModeScreen.js';

import AnalysisLoadingScreen from '../screens/AnalysisLoadingScreen.js';
import AnalysisResultsScreen from '../screens/AnalysisResultsScreen.js';
import MovementSelectionScreen from '../screens/MovementSelectionScreen.js';
import VideoUploadScreen from '../screens/VideoUploadScreen.js';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs({ setIsLoggedIn }) {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 0,
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          borderTopColor: 'transparent',
          height: 60 + insets.bottom, // Add safe area to height
          paddingBottom: 5 + insets.bottom, // Add safe area to padding
          marginBottom: 0, // Remove manual margin, handled by insets
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          ...Fonts.getFont('small', 'regular'),
        },
        // Explicitly set label position to avoid layout issues
        tabBarLabelPosition: 'below-icon',
        // Add safe area insets to avoid conflicts with phone navigation
        safeAreaInsets: { bottom: insets.bottom },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'analysis') {
            iconName = focused ? 'analytics' : 'analytics-outline';
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
      <Tab.Screen name="home">
        {(props) => <HomeScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
      <Tab.Screen name="analysis">
        {(props) => <ProgressScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
      <Tab.Screen name="Community">
        {(props) => <CommunityScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
      <Tab.Screen name="Feed">
        {(props) => <PostsScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
      <Tab.Screen name="Settings">
        {(props) => <SettingsScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ isLoggedIn, setIsLoggedIn }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background },
        // Explicitly set header styles to avoid font issues
        headerTitleStyle: {
          ...Fonts.getFont('large', 'bold'),
          color: Colors.textPrimary,
        },
        headerBackTitleStyle: {
          ...Fonts.getFont('medium', 'regular'),
          color: Colors.textPrimary,
        }
      }}
    >
      {isLoggedIn ? (
        <>
          <Stack.Screen name="MainTabs">
            {(props) => <MainTabs {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
          

          {/* Add new post-related screens */}
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
          />
          
          <Stack.Screen
            name="BadgesAndMilestonesScreen"
            component={BadgesAndMilestonesScreen}
          />
          <Stack.Screen
            name="aichatscreen"
            component={aichatscreen}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
          />
          <Stack.Screen
            name="image3dplot"
            component={image3dplot}
          />
          <Stack.Screen 
            name="DemoSession" 
            component={DemoSessionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="FormCorrectionModeScreen" 
            component={FormCorrectionModeScreen}
            options={{ 
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
          <Stack.Screen 
            name="AnalysisLoadingScreen" 
            component={AnalysisLoadingScreen}
            options={{ 
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
          
          <Stack.Screen 
            name="AnalysisResultsScreen" 
            component={AnalysisResultsScreen}
            options={{ 
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
          <Stack.Screen 
            name="VideoUploadScreen" 
            component={VideoUploadScreen}
            options={{ 
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />

          <Stack.Screen 
            name="MovementSelectionScreen" 
            component={MovementSelectionScreen}
            options={{ 
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
          {/* POSE ESTIMATION SCREENS - Original System */}
          
          
          
          

          {/* NEW SIMPLE MULTI-PHONE SYSTEM SCREENS - ADD THESE */}
          <Stack.Screen 
            name="UpdatedPoseEstimationSelectionScreen" 
            component={UpdatedPoseEstimationSelectionScreen}
            options={{ headerShown: false }}
          />
          
          
          

          {/* Existing screens */}
          <Stack.Screen
            name="FindFriend"
            component={FindFriendScreen}
          />
          <Stack.Screen
            name="image_analyser3d"
            component={image_analyser3d}
          />
          <Stack.Screen
            name="test"
            component={test}
          />
          <Stack.Screen
            name="UserProfileScreen"
            component={UserProfileScreen}
          />
          
          <Stack.Screen
            name="GymFinder"
            component={GymFinder}
          />
          <Stack.Screen
            name="SearchFriends"
            component={SearchFriendsScreen}
          />
          <Stack.Screen
            name="NoConversation"
            component={NoConversationScreen}
          />
          <Stack.Screen
            name="CameraScreen"
            component={CameraScreen}
          />
          <Stack.Screen
            name="Performance"
            component={PerformanceScreen}
          />
          <Stack.Screen
            name="PerformanceComparisonScreen"
            component={PerformanceComparisonScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn">
            {(props) => <SignIn {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
          <Stack.Screen name="SignUp">
            {(props) => <SignUp {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}