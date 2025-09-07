import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';

const { width } = Dimensions.get('window');

export default function UpdatedPoseEstimationSelectionScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const navigateToGallery = () => {
    // Navigate to existing gallery-based pose estimation
    navigation.navigate('image3dplot');
  };

  const navigateToSimpleMultiPhone = () => {
    // Navigate to new simple multi-phone capture system
    navigation.navigate('SimpleMultiPhoneScreen');
  };

  const navigateToAdvancedMultiPhone = () => {
    // Show info about the advanced system
    Alert.alert(
      'Advanced Multi-Phone System',
      'The advanced WiFi-based system has been replaced with a simpler, more reliable version. Would you like to try the new system instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try New System', onPress: navigateToSimpleMultiPhone }
      ]
    );
  };

  const OptionCard = ({ 
    title, 
    description, 
    icon, 
    onPress, 
    gradient,
    features,
    badge = null,
    isRecommended = false
  }) => (
    <Animated.View style={[{ transform: [{ scale: buttonScale }] }]}>
      <TouchableOpacity
        style={[
          styles.optionCard,
          isRecommended && styles.recommendedCard
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: gradient[0] }]}>
            <Ionicons name={icon} size={32} color="white" />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
            
            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={24} color="rgba(255, 255, 255, 0.7)" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <Animated.View 
          style={[
            styles.content,
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pose Estimation</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>Choose Your Analysis Method</Text>
            <Text style={styles.subtitle}>
              Select how you want to capture and analyze poses
            </Text>

            <View style={styles.optionsContainer}>
              {/* Gallery Option */}
              <OptionCard
                title="Gallery Analysis"
                description="Analyze poses from existing photos in your gallery"
                icon="images"
                onPress={navigateToGallery}
                gradient={["#3c3c3c", "#2a2a2a"]}
                features={[
                  "Single photo analysis",
                  "33 pose landmarks",
                  "2D visualization",
                  "Quick results"
                ]}
              />

              {/* Simple Multi-Phone Option */}
              <OptionCard
                title="Multi-Phone Capture"
                description="Connect multiple phones for advanced 3D pose analysis"
                icon="phone-portrait"
                onPress={navigateToSimpleMultiPhone}
                gradient={[Colors.primary, "#c44569"]}
                features={[
                  "Multi-angle capture",
                  "3D pose reconstruction", 
                  "Simple connection",
                  "Interactive 3D model"
                ]}
                badge="NEW & IMPROVED"
                isRecommended={true}
              />

              {/* Advanced System (Deprecated) */}
              <OptionCard
                title="Advanced WiFi System"
                description="Legacy automated WiFi system (deprecated)"
                icon="wifi"
                onPress={navigateToAdvancedMultiPhone}
                gradient={["#6c757d", "#495057"]}
                features={[
                  "Automated hotspot",
                  "Complex setup",
                  "Device-dependent",
                  "Legacy support"
                ]}
                badge="DEPRECATED"
              />
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Recommended: New Multi-Phone System</Text>
                  <Text style={styles.infoDescription}>
                    The new system is much more reliable and easier to use. Just connect all phones to the same WiFi network and use simple connection codes.
                  </Text>
                </View>
              </View>
              
              <View style={styles.requirementsCard}>
                <Ionicons name="wifi" size={20} color="#4CAF50" />
                <Text style={styles.requirementsText}>
                  Requirements: All phones on same WiFi network
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  mainContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 30,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  recommendedCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 15,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  featuresContainer: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  infoSection: {
    marginTop: 20,
    gap: 15,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  requirementsCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  requirementsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
});