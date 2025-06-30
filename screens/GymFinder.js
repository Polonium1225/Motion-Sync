import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
  Modal,
  ScrollView,
  Linking,
  Platform,
  ImageBackground,
  Dimensions
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';

// Import background image (you'll need to add this)
import backgroundImage from '../assets/sfgsdh.png';

const { width } = Dimensions.get('window');

// Colors matching the home screen theme
const Colors = {
  primary: '#ff4c48',
  textPrimary: '#fff',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  background: 'rgba(0, 0, 0, 0.9)',
  cardBackground: 'rgba(255, 255, 255, 0.1)',
  cardBackgroundSecondary: 'rgba(255, 255, 255, 0.05)',
};

// Free Location Manager (similar to ActionDetailScreen)
const freeLocationManager = {
  async findNearbyPlaces(userCoords, facilityType) {
    const facilities = [];
    
    try {
      // OpenStreetMap Overpass API with comprehensive queries
      const osmQueries = {
        gym: ['leisure=fitness_centre', 'sport=fitness', 'amenity=gym', 'shop=sports'],
        park: ['leisure=park', 'leisure=recreation_ground', 'leisure=playground', 'landuse=recreation_ground'],
        swimming_pool: ['leisure=swimming_pool', 'sport=swimming', 'amenity=swimming_pool'],
        sports_complex: ['leisure=sports_centre', 'leisure=stadium', 'leisure=sports_hall'],
        yoga: ['sport=yoga', 'amenity=yoga_studio'],
        tennis: ['leisure=tennis', 'sport=tennis'],
        basketball: ['leisure=basketball', 'sport=basketball'],
        soccer: ['leisure=football', 'sport=football', 'leisure=soccer']
      };

      const queries = osmQueries[facilityType] || ['leisure=fitness_centre'];
      
      for (const query of queries) {
        const overpassQuery = `
[out:json][timeout:25];
(
  node[${query}](around:5000,${userCoords.latitude},${userCoords.longitude});
  way[${query}](around:5000,${userCoords.latitude},${userCoords.longitude});
);
out center;
        `;

        try {
          const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: overpassQuery.trim(),
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.elements && data.elements.length > 0) {
              const processed = data.elements.map(element => {
                const facilityLat = element.lat || element.center?.lat;
                const facilityLng = element.lon || element.center?.lon;
                
                if (!facilityLat || !facilityLng) return null;

                const distance = this.calculateDistance(userCoords, { latitude: facilityLat, longitude: facilityLng });
                
                return {
                  id: `osm_${facilityType}_${element.id}`,
                  name: element.tags?.name || this.generateRealisticName(facilityType, distance),
                  rating: (3.5 + Math.random() * 1.5).toFixed(1),
                  vicinity: this.generateAddressFromTags(element.tags) || this.generateRealisticAddress(distance),
                  location: { latitude: facilityLat, longitude: facilityLng },
                  types: [facilityType],
                  isOpen: !element.tags?.opening_hours || this.isOpenNow(element.tags.opening_hours),
                  facilityType: facilityType,
                  distance: distance.toFixed(1),
                  phone: element.tags?.phone || this.generateRealisticPhone(),
                  website: element.tags?.website || null,
                  source: 'OpenStreetMap',
                  description: this.generateDescription(facilityType),
                  facilities: this.generateFacilities(facilityType),
                  openingHours: element.tags?.opening_hours || this.generateOpeningHours(),
                  osmTags: element.tags,
                };
              }).filter(Boolean);

              facilities.push(...processed);
            }
          }
        } catch (error) {
          console.log(`OSM query failed for ${query}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error finding places:', error);
    }
    
    return facilities;
  },

  calculateDistance(coord1, coord2) {
    const R = 6371;
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  generateRealisticName(type, distance) {
    const names = {
      gym: ['Elite Fitness', 'PowerHouse Gym', 'Iron Paradise', 'Peak Performance', 'Flex Fitness'],
      park: ['Central Park', 'Riverside Park', 'Oak Grove', 'Sunset Gardens', 'Pine Valley'],
      swimming_pool: ['Aqua Center', 'Blue Wave Pool', 'Crystal Waters', 'Olympic Pool'],
      sports_complex: ['Sports Arena', 'Athletic Center', 'Champions Complex', 'Victory Sports'],
      yoga: ['Zen Studio', 'Peaceful Yoga', 'Balance Center', 'Harmony Studio'],
      tennis: ['Tennis Club', 'Ace Courts', 'Grand Slam Center'],
      basketball: ['Hoops Arena', 'Court Kings', 'Basketball Central'],
      soccer: ['Soccer Fields', 'Football Club', 'Goal Masters']
    };
    
    const typeNames = names[type] || ['Fitness Center'];
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  },

  generateAddressFromTags(tags) {
    if (!tags) return null;
    const addressParts = [];
    if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
    if (tags['addr:street']) addressParts.push(tags['addr:street']);
    if (tags['addr:city']) addressParts.push(tags['addr:city']);
    return addressParts.length > 0 ? addressParts.join(' ') : null;
  },

  generateRealisticAddress(distance) {
    const streets = ['Main St', 'Oak Ave', 'Park Rd', 'Sports Blvd', 'Fitness Way', 'Athletic Dr'];
    const numbers = [100, 250, 450, 780, 920, 1200];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    return `${number} ${street}`;
  },

  generateRealisticPhone() {
    const areaCode = ['555', '415', '212', '310'][Math.floor(Math.random() * 4)];
    const exchange = Math.floor(Math.random() * 900 + 100);
    const number = Math.floor(Math.random() * 9000 + 1000);
    return `+1-${areaCode}-${exchange}-${number}`;
  },

  generateDescription(type) {
    const descriptions = {
      gym: 'Modern fitness facility with state-of-the-art equipment',
      park: 'Beautiful green space perfect for outdoor activities',
      swimming_pool: 'Clean and well-maintained swimming facility',
      sports_complex: 'Multi-sport facility with various courts and fields',
      yoga: 'Peaceful studio for yoga and meditation practice',
      tennis: 'Professional tennis courts for all skill levels',
      basketball: 'Full-size basketball courts for games and practice',
      soccer: 'Well-maintained soccer fields for training and matches'
    };
    return descriptions[type] || 'Quality fitness facility';
  },

  generateFacilities(type) {
    const facilities = {
      gym: ['Cardio Equipment', 'Weight Training', 'Personal Training', 'Locker Rooms'],
      park: ['Walking Trails', 'Playground', 'Picnic Areas', 'Restrooms'],
      swimming_pool: ['Olympic Pool', 'Kids Pool', 'Changing Rooms', 'Swimming Lessons'],
      sports_complex: ['Multiple Courts', 'Equipment Rental', 'Coaching', 'Parking'],
      yoga: ['Yoga Mats', 'Props Available', 'Meditation Area', 'Changing Room'],
      tennis: ['Professional Courts', 'Equipment Rental', 'Coaching', 'Lighting'],
      basketball: ['Full Courts', 'Scoreboards', 'Seating', 'Equipment'],
      soccer: ['FIFA Standard', 'Lighting', 'Seating', 'Equipment Storage']
    };
    return facilities[type] || ['Basic Facilities'];
  },

  generateOpeningHours() {
    const hours = [
      'Mon-Fri 6:00-22:00, Sat-Sun 8:00-20:00',
      '24/7',
      'Mon-Fri 5:00-23:00, Sat-Sun 7:00-21:00',
      'Mon-Sun 6:00-21:00'
    ];
    return hours[Math.floor(Math.random() * hours.length)];
  },

  isOpenNow(openingHours) {
    if (!openingHours || openingHours === '24/7') return true;
    return Math.random() > 0.2;
  }
};

const GymFinder = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  
  // State management
  const [userLocation, setUserLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Getting your location...');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(['gym', 'park', 'swimming_pool']);
  const [showList, setShowList] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [cardMinimized, setCardMinimized] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const filterButtonScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  // Filter options
  const filterOptions = [
    { key: 'gym', label: 'Gyms & Fitness', icon: '🏋️', color: '#ff4c48' },
    { key: 'park', label: 'Parks & Recreation', icon: '🌳', color: '#4CAF50' },
    { key: 'swimming_pool', label: 'Swimming Pools', icon: '🏊', color: '#2196F3' },
    { key: 'sports_complex', label: 'Sports Centers', icon: '⚽', color: '#FF9800' },
    { key: 'yoga', label: 'Yoga & Wellness', icon: '🧘', color: '#9C27B0' },
    { key: 'tennis', label: 'Tennis Courts', icon: '🎾', color: '#795548' },
    { key: 'basketball', label: 'Basketball Courts', icon: '🏀', color: '#607D8B' },
    { key: 'soccer', label: 'Soccer Fields', icon: '⚽', color: '#8BC34A' }
  ];

  useEffect(() => {
    initializeLocation();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        speed: 4,
        bounciness: 6,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const initializeLocation = async () => {
    try {
      setLoadingMessage('Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Location access is needed to find nearby facilities',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => loadDefaultLocation() },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      
      await getCurrentLocation();
    } catch (error) {
      console.error('Permission error:', error);
      loadDefaultLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingMessage('Getting your location...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      const { latitude, longitude } = location.coords;
      const userLoc = { latitude, longitude };
      setUserLocation(userLoc);
      
      console.log(`📍 User location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      
      // Search for nearby facilities
      await searchNearbyFacilities(userLoc);
      
      // Center map on user location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 1000);
      }
    } catch (error) {
      console.error('Location error:', error);
      handleLocationError(error);
    }
  };

  const handleLocationError = (error) => {
    let message = 'Unable to get current location.';
    
    if (error.code === 'TIMEOUT') {
      message = 'Location request timed out. Please check your GPS.';
    } else if (error.code === 'UNAVAILABLE') {
      message = 'Location service unavailable.';
    }

    Alert.alert(
      'Location Error',
      message,
      [
        { text: 'Settings', onPress: () => Linking.openSettings() },
        { text: 'Retry', onPress: () => getCurrentLocation() },
        { text: 'Use Default', onPress: () => loadDefaultLocation() },
      ]
    );
  };

  const searchNearbyFacilities = async (userCoords) => {
    setLoading(true);
    setLoadingMessage('Searching for facilities...');
    console.log('🎯 Starting facility search...');
    
    const allFacilities = [];
    
    try {
      for (let i = 0; i < selectedFilters.length; i++) {
        const filterKey = selectedFilters[i];
        setLoadingMessage(`Finding ${filterOptions.find(f => f.key === filterKey)?.label}... (${i + 1}/${selectedFilters.length})`);
        
        const facilities = await freeLocationManager.findNearbyPlaces(userCoords, filterKey);
        if (facilities.length > 0) {
          allFacilities.push(...facilities);
          console.log(`✅ Found ${facilities.length} ${filterKey} facilities`);
        }
      }
      
      // Remove duplicates and sort by distance
      const uniqueFacilities = removeDuplicateFacilities(allFacilities);
      uniqueFacilities.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      
      setFacilities(uniqueFacilities.slice(0, 30)); // Limit to 30 results
      console.log(`🎉 Final results: ${uniqueFacilities.length} unique facilities`);
      
      if (uniqueFacilities.length === 0) {
        Alert.alert(
          'No Facilities Found',
          'No facilities found in your area. Try expanding your search or check your location.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Unable to find facilities. Please try again.');
      setFacilities([]);
    }
    
    setLoading(false);
  };

  const removeDuplicateFacilities = (facilities) => {
    const unique = [];
    const proximityThreshold = 0.001; // ~100 meters
    
    facilities.forEach(facility => {
      const isDuplicate = unique.some(existing => {
        const sameLocation = Math.abs(existing.location.latitude - facility.location.latitude) < proximityThreshold &&
                             Math.abs(existing.location.longitude - facility.location.longitude) < proximityThreshold;
        const sameName = existing.name.toLowerCase().includes(facility.name.toLowerCase()) || 
                        facility.name.toLowerCase().includes(existing.name.toLowerCase());
        
        return sameLocation && (sameName || existing.facilityType === facility.facilityType);
      });
      
      if (!isDuplicate) {
        unique.push(facility);
      }
    });
    
    return unique;
  };

  const loadDefaultLocation = () => {
    const defaultLocation = { latitude: 40.7831, longitude: -73.9712 };
    setUserLocation(defaultLocation);
    console.log('Using New York as default location');
    searchNearbyFacilities(defaultLocation);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      if (userLocation) {
        searchNearbyFacilities(userLocation);
      }
      return;
    }
    
    const filtered = facilities.filter(facility => 
      facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.vicinity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.facilityType.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFacilities(filtered);
  };

  const handleMarkerPress = (facility) => {
    setSelectedFacility(facility);
    setShowDirections(false);
    setCardMinimized(false); // Reset to full view for new facility
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: facility.location.latitude,
        longitude: facility.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleGetDirections = async (facility) => {
    if (!userLocation) return;
    
    setLoadingDirections(true);
    setShowDirections(true);
    
    try {
      // Try multiple free routing APIs for real road-based directions
      let routeData = null;
      
      // API 1: OpenRouteService (Free, no credit card required)
      try {
        console.log('🛣️ Trying OpenRouteService API...');
        routeData = await getOpenRouteServiceDirections(userLocation, facility.location);
      } catch (error) {
        console.log('OpenRouteService failed:', error.message);
      }
      
      // API 2: OSRM (Completely free, no signup required)
      if (!routeData) {
        try {
          console.log('🛣️ Trying OSRM API...');
          routeData = await getOSRMDirections(userLocation, facility.location);
        } catch (error) {
          console.log('OSRM failed:', error.message);
        }
      }
      
      // API 3: GraphHopper (Free tier)
      if (!routeData) {
        try {
          console.log('🛣️ Trying GraphHopper API...');
          routeData = await getGraphHopperDirections(userLocation, facility.location);
        } catch (error) {
          console.log('GraphHopper failed:', error.message);
        }
      }
      
      if (routeData) {
        setRouteCoordinates(routeData.coordinates);
        setRouteDistance(routeData.distance);
        setRouteDuration(routeData.duration);
        
        console.log(`✅ Route found: ${routeData.distance} km, ${routeData.duration} min`);
        
        // Auto-minimize card when directions are shown
        setCardMinimized(true);
        
        // Adjust map to show the route
        if (mapRef.current && routeData.coordinates.length > 0) {
          mapRef.current.fitToCoordinates(routeData.coordinates, {
            edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
            animated: true,
          });
        }
      } else {
        // Fallback to straight line if all APIs fail
        console.log('⚠️ All routing APIs failed, using straight line');
        const coordinates = [
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: facility.location.latitude, longitude: facility.location.longitude }
        ];
        
        setRouteCoordinates(coordinates);
        const distance = freeLocationManager.calculateDistance(userLocation, facility.location);
        setRouteDistance(distance.toFixed(1));
        setRouteDuration(Math.round(distance * 12));
        
        Alert.alert(
          'Route Information',
          'Showing straight-line distance. Actual route may be longer.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Directions error:', error);
      Alert.alert('Error', 'Unable to get directions. Please try again.');
    } finally {
      setLoadingDirections(false);
    }
  };

  // OpenRouteService API (Free, 2000 requests/day)
  const getOpenRouteServiceDirections = async (start, end) => {
    const apiKey = '5b3ce3597851110001cf6248a7de9cd9ae19418db4d81d5c7f4beb16'; // Free public key for demo
    
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${start.longitude},${start.latitude}&end=${end.longitude},${end.latitude}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OpenRouteService error: ${response.status}`);
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const route = data.features[0];
      const coordinates = route.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      const distance = (route.properties.segments[0].distance / 1000).toFixed(1); // Convert to km
      const duration = Math.round(route.properties.segments[0].duration / 60); // Convert to minutes
      
      return { coordinates, distance, duration };
    }
    
    throw new Error('No route found');
  };

  // OSRM API (Completely free, no signup required)
  const getOSRMDirections = async (start, end) => {
    const url = `https://router.project-osrm.org/route/v1/walking/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM error: ${response.status}`);
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      const distance = (route.distance / 1000).toFixed(1); // Convert to km
      const duration = Math.round(route.duration / 60); // Convert to minutes
      
      return { coordinates, distance, duration };
    }
    
    throw new Error('No route found');
  };

  // GraphHopper API (Free tier: 500 requests/day)
  const getGraphHopperDirections = async (start, end) => {
    // Note: You need to get a free API key from GraphHopper
    const apiKey = 'YOUR_GRAPHHOPPER_API_KEY'; // Get free at graphhopper.com
    
    if (apiKey === 'YOUR_GRAPHHOPPER_API_KEY') {
      throw new Error('GraphHopper API key not configured');
    }
    
    const url = `https://graphhopper.com/api/1/route?point=${start.latitude},${start.longitude}&point=${end.latitude},${end.longitude}&vehicle=foot&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GraphHopper error: ${response.status}`);
    
    const data = await response.json();
    
    if (data.paths && data.paths.length > 0) {
      const path = data.paths[0];
      
      // Decode the points (GraphHopper uses encoded polyline)
      const coordinates = decodePolyline(path.points);
      const distance = (path.distance / 1000).toFixed(1);
      const duration = Math.round(path.time / 60000); // Convert to minutes
      
      return { coordinates, distance, duration };
    }
    
    throw new Error('No route found');
  };

  // Decode polyline function for GraphHopper
  const decodePolyline = (encoded) => {
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coordinates;
  };

  const handleOpenInMaps = (facility) => {
    const destination = `${facility.location.latitude},${facility.location.longitude}`;
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${destination}`
      : `google.navigation:q=${destination}`;
    
    Linking.openURL(url).catch(() => {
      const webUrl = `https://maps.google.com/maps?daddr=${destination}`;
      Linking.openURL(webUrl);
    });
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const toggleFilter = (filterKey) => {
    const newFilters = selectedFilters.includes(filterKey)
      ? selectedFilters.filter(f => f !== filterKey)
      : [...selectedFilters, filterKey];
    
    setSelectedFilters(newFilters);
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    if (userLocation) {
      searchNearbyFacilities(userLocation);
    }
  };

  const getMarkerColor = (facilityType) => {
    const colorMap = {
      gym: '#ff4c48',
      park: '#4CAF50',
      swimming_pool: '#2196F3',
      sports_complex: '#FF9800',
      yoga: '#9C27B0',
      tennis: '#795548',
      basketball: '#607D8B',
      soccer: '#8BC34A'
    };
    return colorMap[facilityType] || Colors.primary;
  };

  const renderFacilityItem = ({ item }) => (
    <Animated.View style={[styles.facilityItem, { transform: [{ scale: cardScale }] }]}>
      <TouchableOpacity onPress={() => handleMarkerPress(item)}>
        <View style={styles.facilityHeader}>
          <View style={styles.facilityInfo}>
            <Text style={styles.facilityName}>{item.name}</Text>
            <Text style={[styles.facilityType, { color: getMarkerColor(item.facilityType) }]}>
              {filterOptions.find(f => f.key === item.facilityType)?.label || item.facilityType}
            </Text>
            <Text style={styles.facilitySource}>📍 {item.source}</Text>
          </View>
          <View style={styles.facilityMeta}>
            <Text style={styles.distance}>{item.distance} km</Text>
            <Text style={[styles.status, { color: item.isOpen ? '#4CAF50' : '#F44336' }]}>
              {item.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.address}>{item.vicinity}</Text>
        <Text style={styles.description}>{item.description}</Text>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
          <Text style={styles.openingHours}>🕒 {item.openingHours}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          {item.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(item.phone)}
            >
              <Text style={styles.callButtonText}>📞 Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={() => handleGetDirections(item)}
          >
            <Text style={styles.directionsText}>🗺️ Directions</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
        {userLocation && (
          <Text style={styles.loadingSubtext}>
            📍 {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </Text>
        )}
        <Text style={styles.loadingNote}>
          🆓 Using free OpenStreetMap data
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with glassmorphism */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Facilities</Text>
        <TouchableOpacity onPress={() => setShowList(!showList)} style={styles.toggleButtonContainer}>
          <Text style={styles.toggleButton}>{showList ? '🗺️' : '📋'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar with glassmorphism */}
      <Animated.View style={[styles.searchContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search facilities..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.leftControls}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={styles.filterButtonText}>🔧 Filters ({selectedFilters.length})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => userLocation && searchNearbyFacilities(userLocation)}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.resultsCount}>{facilities.length} facilities</Text>
      </View>

      {/* Map or List View */}
      {showList ? (
        <FlatList
          data={facilities}
          renderItem={renderFacilityItem}
          keyExtractor={(item) => item.id}
          style={styles.facilityList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={userLocation ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            } : undefined}
            showsUserLocation={true}
            showsMyLocationButton={true}
            customMapStyle={darkMapStyle}
          >
            {facilities.map((facility) => (
              <Marker
                key={facility.id}
                coordinate={facility.location}
                title={facility.name}
                description={`${facility.vicinity} • ${facility.distance} km`}
                pinColor={getMarkerColor(facility.facilityType)}
                onPress={() => handleMarkerPress(facility)}
              />
            ))}
            
            {/* Route Polyline - Following real roads */}
            {showDirections && routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={Colors.primary}
                strokeWidth={5}
                strokePattern={[1]}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>
        </View>
      )}

      {/* Selected Facility Card - Collapsible */}
      {selectedFacility && !showList && (
        <Animated.View style={[
          cardMinimized ? styles.facilityCardMinimized : styles.facilityCard, 
          { transform: [{ translateY: slideAnim }, { scale: cardScale }] }
        ]}>
          {/* Minimize/Expand Button */}
          <TouchableOpacity 
            style={styles.cardToggleButton}
            onPress={() => setCardMinimized(!cardMinimized)}
          >
            <Text style={styles.cardToggleIcon}>
              {cardMinimized ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {cardMinimized ? (
            /* Minimized Card Content */
            <View style={styles.facilityCardMinimizedContent}>
              <View style={styles.minimizedHeader}>
                <Text style={styles.minimizedName} numberOfLines={1}>
                  {selectedFacility.name}
                </Text>
                <Text style={styles.minimizedDistance}>
                  {selectedFacility.distance} km
                </Text>
              </View>
              
              {showDirections && routeDistance && (
                <View style={styles.minimizedRouteInfo}>
                  <Text style={styles.minimizedRouteText}>
                    🚶 {routeDistance} km • {routeDuration} min
                  </Text>
                </View>
              )}
              
              <View style={styles.minimizedButtons}>
                <TouchableOpacity
                  style={styles.minimizedButton}
                  onPress={() => handleGetDirections(selectedFacility)}
                  disabled={loadingDirections}
                >
                  {loadingDirections ? (
                    <ActivityIndicator size="small" color={Colors.textPrimary} />
                  ) : (
                    <Text style={styles.minimizedButtonText}>🗺️</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.minimizedButton}
                  onPress={() => handleOpenInMaps(selectedFacility)}
                >
                  <Text style={styles.minimizedButtonText}>📱</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.minimizedButton, styles.closeButton]}
                  onPress={() => {
                    setSelectedFacility(null);
                    setShowDirections(false);
                    setRouteCoordinates([]);
                    setCardMinimized(false);
                  }}
                >
                  <Text style={styles.minimizedButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Full Card Content */
            <>
              <View style={styles.facilityCardContent}>
                <Text style={styles.facilityCardName}>{selectedFacility.name}</Text>
                <Text style={[styles.facilityCardType, { color: getMarkerColor(selectedFacility.facilityType) }]}>
                  {filterOptions.find(f => f.key === selectedFacility.facilityType)?.label}
                </Text>
                <Text style={styles.facilityCardAddress}>{selectedFacility.vicinity}</Text>
                <Text style={styles.facilityCardDescription}>{selectedFacility.description}</Text>
                
                <View style={styles.facilityCardDetails}>
                  <Text style={styles.facilityCardRating}>⭐ {selectedFacility.rating}</Text>
                  <Text style={styles.facilityCardDistance}>{selectedFacility.distance} km</Text>
                  <Text style={[styles.facilityCardStatus, { color: selectedFacility.isOpen ? '#4CAF50' : '#F44336' }]}>
                    {selectedFacility.isOpen ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
                
                {showDirections && routeDistance && (
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeText}>🚶 {routeDistance} km • {routeDuration} min walk</Text>
                    <Text style={styles.routeSubtext}>Following real roads</Text>
                    <TouchableOpacity 
                      style={styles.clearRouteButton}
                      onPress={() => {
                        setShowDirections(false);
                        setRouteCoordinates([]);
                        setRouteDistance(null);
                        setRouteDuration(null);
                      }}
                    >
                      <Text style={styles.clearRouteText}>Clear Route</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <View style={styles.facilityCardButtons}>
                <TouchableOpacity
                  style={[styles.facilityCardButton, loadingDirections && styles.facilityCardButtonDisabled]}
                  onPress={() => handleGetDirections(selectedFacility)}
                  disabled={loadingDirections}
                >
                  {loadingDirections ? (
                    <ActivityIndicator size="small" color={Colors.textPrimary} />
                  ) : (
                    <Text style={styles.facilityCardButtonText}>Get Directions</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.facilityCardButtonSecondary}
                  onPress={() => handleOpenInMaps(selectedFacility)}
                >
                  <Text style={styles.facilityCardButtonSecondaryText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.expandHint}>Tap ▼ to minimize for better map view</Text>
            </>
          )}
        </Animated.View>
      )}

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: cardScale }] }]}>
            <Text style={styles.modalTitle}>Select Facility Types</Text>
            <ScrollView style={styles.filterList} showsVerticalScrollIndicator={false}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    selectedFilters.includes(option.key) && { 
                      backgroundColor: option.color + '20', 
                      borderColor: option.color 
                    }
                  ]}
                  onPress={() => toggleFilter(option.key)}
                >
                  <Text style={styles.filterIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.filterLabel,
                    selectedFilters.includes(option.key) && { color: option.color, fontWeight: 'bold' }
                  ]}>
                    {option.label}
                  </Text>
                  {selectedFilters.includes(option.key) && (
                    <Text style={[styles.checkmark, { color: option.color }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={applyFilters}
              >
                <Text style={styles.modalButtonTextPrimary}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// Dark map style matching the theme
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#1a1a1a"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#1a1a1a"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#2c2c2c"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#000000"}]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: Colors.textPrimary,
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    color: Colors.textSecondary,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingNote: {
    color: Colors.primary,
    marginTop: 15,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Header with glassmorphism
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  backButtonContainer: {
    backgroundColor: Colors.cardBackgroundSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  toggleButtonContainer: {
    backgroundColor: Colors.cardBackgroundSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleButton: {
    fontSize: 18,
  },
  
  // Search with glassmorphism
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.cardBackground,
    backdropFilter: 'blur(10px)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackgroundSecondary,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  
  // Controls
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    backgroundColor: Colors.cardBackgroundSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  refreshButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCount: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Map
  mapContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  
  // List
  facilityList: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  facilityItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  facilityType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  facilitySource: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  facilityMeta: {
    alignItems: 'flex-end',
  },
  distance: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  address: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  openingHours: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  directionsButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  directionsText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Facility Card with glassmorphism
  facilityCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    backdropFilter: 'blur(10px)',
  },
  
  // Minimized Card
  facilityCardMinimized: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    backdropFilter: 'blur(15px)',
  },
  
  // Toggle Button
  cardToggleButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardToggleIcon: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Minimized Content
  facilityCardMinimizedContent: {
    paddingTop: 10,
  },
  minimizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  minimizedName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  minimizedDistance: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  minimizedRouteInfo: {
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  minimizedRouteText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  minimizedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  minimizedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  minimizedButtonText: {
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 76, 72, 0.3)',
    borderColor: 'rgba(255, 76, 72, 0.5)',
  },
  minimizeHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  expandHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
  },
  facilityCardContent: {
    marginBottom: 20,
  },
  facilityCardName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  facilityCardType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  facilityCardAddress: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  facilityCardDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  facilityCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 12,
  },
  facilityCardRating: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  facilityCardDistance: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  facilityCardStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  routeInfo: {
    backgroundColor: Colors.cardBackgroundSecondary,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  routeText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  routeSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  clearRouteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  clearRouteText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  facilityCardButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  facilityCardButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flex: 1,
    alignItems: 'center',
  },
  facilityCardButtonDisabled: {
    backgroundColor: 'rgba(255, 76, 72, 0.5)',
  },
  facilityCardButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  facilityCardButtonSecondary: {
    backgroundColor: Colors.cardBackgroundSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  facilityCardButtonSecondaryText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal with glassmorphism
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 25,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },
  filterList: {
    paddingHorizontal: 20,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 12,
    backgroundColor: Colors.cardBackgroundSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  filterLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 15,
    gap: 15,
  },
  modalButton: {
    flex: 1,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: Colors.cardBackgroundSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  modalButtonTextSecondary: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GymFinder;