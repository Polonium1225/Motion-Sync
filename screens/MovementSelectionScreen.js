import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Animated,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

const backgroundImage = require('../assets/sfgsdh.png');

const movements = [
  {
    id: 'squats',
    name: 'Squats',
    icon: 'fitness',
    description: 'Lower body strength',
    muscles: 'Quads, Glutes, Hamstrings',
    color: '#ff4c48',
    available: true
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    icon: 'barbell',
    description: 'Upper body strength',
    muscles: 'Chest, Shoulders, Triceps',
    color: '#ff6b6b',
    available: false // Will be available after squats implementation
  },
  {
    id: 'pullups',
    name: 'Pull-ups',
    icon: 'body',
    description: 'Back and arm strength',
    muscles: 'Lats, Biceps, Rhomboids',
    color: '#ffa726',
    available: false
  },
  {
    id: 'dips',
    name: 'Dips',
    icon: 'trending-down',
    description: 'Tricep focused',
    muscles: 'Triceps, Chest, Shoulders',
    color: '#66bb6a',
    available: false
  },
  {
    id: 'lunges',
    name: 'Lunges',
    icon: 'walk',
    description: 'Unilateral leg strength',
    muscles: 'Quads, Glutes, Calves',
    color: '#42a5f5',
    available: false
  },
  {
    id: 'planks',
    name: 'Planks',
    icon: 'remove',
    description: 'Core stability',
    muscles: 'Abs, Core, Shoulders',
    color: '#ab47bc',
    available: false
  }
];

export default function MovementSelectionScreen({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleMovementSelect = (movement) => {
    if (movement.available) {
      navigation.navigate('VideoUploadScreen', { 
        movement: movement.id,
        movementName: movement.name 
      });
    }
  };

  const renderMovementCard = (movement, index) => {
    const animationDelay = index * 100;
    const cardScale = useState(new Animated.Value(0))[0];

    useEffect(() => {
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 400,
        delay: animationDelay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        key={movement.id}
        style={[
          styles.movementCardContainer,
          { transform: [{ scale: cardScale }] }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.movementCard,
            !movement.available && styles.disabledCard
          ]}
          onPress={() => handleMovementSelect(movement)}
          activeOpacity={movement.available ? 0.8 : 1}
        >
          <LinearGradient
            colors={movement.available ? 
              [`${movement.color}40`, `${movement.color}10`] :
              ['rgba(128, 128, 128, 0.3)', 'rgba(128, 128, 128, 0.1)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Available Badge */}
            {movement.available && (
              <View style={styles.availableBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
              </View>
            )}

            {/* Coming Soon Badge */}
            {!movement.available && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            )}

            {/* Icon Container */}
            <View style={[
              styles.iconContainer,
              { backgroundColor: movement.available ? `${movement.color}30` : 'rgba(128, 128, 128, 0.3)' }
            ]}>
              <Ionicons 
                name={movement.icon} 
                size={32} 
                color={movement.available ? movement.color : '#888'} 
              />
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <Text style={[
                styles.movementName,
                !movement.available && styles.disabledText
              ]}>
                {movement.name}
              </Text>
              <Text style={[
                styles.movementDescription,
                !movement.available && styles.disabledText
              ]}>
                {movement.description}
              </Text>
              <Text style={[
                styles.muscleGroups,
                !movement.available && styles.disabledText
              ]}>
                {movement.muscles}
              </Text>
            </View>

            {/* Arrow or Lock */}
            <View style={styles.actionIndicator}>
              {movement.available ? (
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              ) : (
                <Ionicons name="lock-closed" size={16} color="#888" />
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={backgroundImage} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Movement</Text>
            <View style={styles.placeholder} />
          </View>

          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Choose Your Exercise</Text>
              <Text style={styles.subtitle}>
                Select a movement to analyze your form and technique
              </Text>
            </View>

            {/* Movements Grid */}
            <ScrollView 
              style={styles.movementsContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.movementsGrid}>
                {movements.map((movement, index) => renderMovementCard(movement, index))}
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={20} color="#ff4c48" />
                  <Text style={styles.infoText}>
                    More movements are coming soon! We're starting with squats and will add other exercises based on user feedback.
                  </Text>
                </View>

                <View style={styles.progressCard}>
                  <View style={styles.progressHeader}>
                    <Ionicons name="trophy" size={20} color="#ffa726" />
                    <Text style={styles.progressTitle}>Implementation Progress</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '16.7%' }]} />
                  </View>
                  <Text style={styles.progressText}>1 of 6 movements ready</Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  movementsContainer: {
    flex: 1,
  },
  movementsGrid: {
    gap: 15,
  },
  movementCardContainer: {
    marginBottom: 5,
  },
  movementCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardGradient: {
    padding: 20,
    position: 'relative',
  },
  availableBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.5)',
  },
  comingSoonText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardContent: {
    flex: 1,
    marginBottom: 10,
  },
  movementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  movementDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  muscleGroups: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 16,
  },
  disabledText: {
    color: '#888',
  },
  actionIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: 30,
    marginBottom: 20,
    gap: 15,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});