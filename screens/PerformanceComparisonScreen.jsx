import React, { useRef, useState, useEffect } from 'react';
import Colors from '../constants/Colors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
  ImageBackground,
  Animated
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';

const { height, width } = Dimensions.get('window');

export default function PerformanceComparisonScreen({ route, navigation }) {
  // Get the processed video URLs with pose estimation from route params
  const { 
    videoUri, 
    pastVideoUri, 
    similarity, 
    smoothness, 
    speed, 
    cohesion, 
    accuracy, 
    improvements, 
    regressions 
  } = route.params;

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefPast = useRef(null);
  const videoRefNew = useRef(null);
  const [barChartHeight, setBarChartHeight] = useState(300);
  const [radarChartHeight, setRadarChartHeight] = useState(300);
  const [pieChartHeight, setPieChartHeight] = useState(300);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 6,
        bounciness: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Handle missing videos
  if (!videoUri || !pastVideoUri) {
    Alert.alert(
      "Missing Videos",
      "One or more videos are missing. Please go back and try again.",
      [{ text: "Go Back", onPress: () => navigation.goBack() }]
    );
    return null;
  }

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await videoRefPast.current?.pauseAsync();
        await videoRefNew.current?.pauseAsync();
      } else {
        await videoRefPast.current?.playAsync();
        await videoRefNew.current?.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Video playback error:", error);
    }
  };

  const handleRestart = async () => {
    try {
      await videoRefPast.current?.pauseAsync();
      await videoRefNew.current?.pauseAsync();
      await videoRefPast.current?.setPositionAsync(0);
      await videoRefNew.current?.setPositionAsync(0);
      setIsPlaying(false);
    } catch (error) {
      console.error("Video restart error:", error);
    }
  };

  // Sanitize data
  const sanitizedSimilarity = Math.min(100, Math.max(0, similarity ?? 75));
  const sanitizedSmoothness = Math.min(100, Math.max(0, smoothness ?? 60));
  const sanitizedSpeed = Math.min(100, Math.max(0, speed ?? 65));
  const sanitizedCohesion = Math.min(100, Math.max(0, cohesion ?? 70));
  const sanitizedAccuracy = Math.min(100, Math.max(0, accuracy ?? 60));
  const sanitizedImprovements = Math.max(0, improvements ?? 2);
  const sanitizedRegressions = Math.max(0, regressions ?? 1);

  // HTML for Bar Chart with updated styling
  const barChartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
      <style>
        body {
          background-color: #0b0a1f;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 15px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 280px !important;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          color: #ff4c48;
          margin-bottom: 15px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Performance Metrics</div>
      <canvas id="barChart" width="${width - 72}" height="280"></canvas>
      <script>
        window.onload = function() {
          const ctx = document.getElementById('barChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Similarity', 'Smoothness', 'Speed', 'Cohesion', 'Accuracy'],
              datasets: [{
                label: 'Performance %',
                data: [${sanitizedSimilarity}, ${sanitizedSmoothness}, ${sanitizedSpeed}, ${sanitizedCohesion}, ${sanitizedAccuracy}],
                backgroundColor: ['#ff4c48', '#ff6666', '#ff8080', '#ff9999', '#ffb3b3'],
                borderColor: '#ff4c48',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: { 
                    color: 'white', 
                    callback: value => value + '%',
                    font: { size: 12 }
                  },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                  ticks: { 
                    color: 'white',
                    font: { size: 11 }
                  },
                  grid: { display: false }
                }
              },
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#ff4c48',
                  bodyColor: 'white',
                  borderColor: '#ff4c48',
                  borderWidth: 1
                }
              },
              animation: {
                duration: 1000,
                easing: 'easeOutCubic'
              }
            }
          });
        };
      </script>
    </body>
    </html>
  `;

  // HTML for Radar Chart
  const radarChartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
      <style>
        body {
          background-color: #0b0a1f;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 15px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 280px !important;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          color: #ff4c48;
          margin-bottom: 15px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Performance Radar</div>
      <canvas id="radarChart" width="${width - 72}" height="280"></canvas>
      <script>
        window.onload = function() {
          const ctx = document.getElementById('radarChart').getContext('2d');
          new Chart(ctx, {
            type: 'radar',
            data: {
              labels: ['Similarity', 'Smoothness', 'Speed', 'Cohesion', 'Accuracy'],
              datasets: [{
                label: 'Performance',
                data: [${sanitizedSimilarity}, ${sanitizedSmoothness}, ${sanitizedSpeed}, ${sanitizedCohesion}, ${sanitizedAccuracy}],
                backgroundColor: 'rgba(255, 76, 72, 0.2)',
                borderColor: '#ff4c48',
                borderWidth: 3,
                pointBackgroundColor: '#ff4c48',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                r: {
                  beginAtZero: true,
                  max: 100,
                  ticks: { 
                    color: 'white',
                    callback: value => value + '%',
                    stepSize: 20,
                    font: { size: 10 }
                  },
                  grid: { color: 'rgba(255, 255, 255, 0.2)' },
                  angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                  pointLabels: { 
                    color: 'white',
                    font: { size: 12, weight: 'bold' }
                  }
                }
              },
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#ff4c48',
                  bodyColor: 'white'
                }
              },
              animation: {
                duration: 1200,
                easing: 'easeOutCubic'
              }
            }
          });
        };
      </script>
    </body>
    </html>
  `;

  // HTML for Pie Chart
  const pieChartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
      <style>
        body {
          background-color: #0b0a1f;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 15px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 250px !important;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          color: #ff4c48;
          margin-bottom: 15px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Improvements vs Regressions</div>
      <canvas id="pieChart" width="${width - 72}" height="250"></canvas>
      <script>
        window.onload = function() {
          const ctx = document.getElementById('pieChart').getContext('2d');
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['Improvements', 'Regressions'],
              datasets: [{
                data: [${sanitizedImprovements}, ${sanitizedRegressions}],
                backgroundColor: ['#ff4c48', '#666'],
                borderColor: '#0b0a1f',
                borderWidth: 3
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { 
                    color: 'white',
                    font: { size: 14, weight: 'bold' },
                    padding: 20
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#ff4c48',
                  bodyColor: 'white'
                }
              },
              animation: {
                duration: 1000,
                easing: 'easeOutCubic'
              }
            }
          });
        };
      </script>
    </body>
    </html>
  `;

  return (
    <ImageBackground
      source={require('../assets/sfgsdh.png')}
      style={styles.container}
      resizeMode="cover"
    >
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
          <Text style={styles.headerTitle}>Performance Analysis</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Video Comparison Container */}
          <View style={styles.videoContainer}>
            <Text style={styles.sectionTitle}>Video Comparison with Pose Analysis</Text>
            
            {/* Past Video */}
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRefPast}
                source={{ uri: pastVideoUri }}
                style={styles.video}
                resizeMode="contain"
                isLooping
                onError={(error) => {
                  console.error("Video loading error (past):", error);
                  Alert.alert("Video Error", "Could not load past performance video.");
                }}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.videoLabel}
              >
                <Text style={styles.videoLabelText}>PAST PERFORMANCE</Text>
                <Text style={styles.videoSubLabel}>With pose landmarks</Text>
              </LinearGradient>
            </View>

            {/* VS Indicator */}
            <View style={styles.vsContainer}>
              <LinearGradient
                colors={['#ff4c48', '#0b0a1f']}
                style={styles.vsCircle}
              >
                <Text style={styles.vsText}>VS</Text>
              </LinearGradient>
            </View>

            {/* New Video */}
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRefNew}
                source={{ uri: videoUri }}
                style={styles.video}
                resizeMode="contain"
                isLooping
                onError={(error) => {
                  console.error("Video loading error (new):", error);
                  Alert.alert("Video Error", "Could not load current performance video.");
                }}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.videoLabel}
              >
                <Text style={styles.videoLabelText}>CURRENT PERFORMANCE</Text>
                <Text style={styles.videoSubLabel}>With pose landmarks</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Analysis Section */}
          <View style={styles.analysisContainer}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>

            {/* Quick Stats */}
            <View style={styles.quickStatsContainer}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{sanitizedSimilarity}%</Text>
                <Text style={styles.quickStatLabel}>Similarity</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{sanitizedAccuracy}%</Text>
                <Text style={styles.quickStatLabel}>Accuracy</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{sanitizedImprovements}</Text>
                <Text style={styles.quickStatLabel}>Improvements</Text>
              </View>
            </View>

            {/* Detailed Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Ionicons name="sync" size={24} color="#ff4c48" />
                <Text style={styles.metricTitle}>Motion Smoothness</Text>
                <View style={styles.progressWrapper}>
                  <View style={[styles.progressBar, { width: `${sanitizedSmoothness}%` }]} />
                  <Text style={styles.metricValue}>{sanitizedSmoothness}%</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="speedometer" size={24} color="#ff4c48" />
                <Text style={styles.metricTitle}>Movement Speed</Text>
                <View style={styles.progressWrapper}>
                  <View style={[styles.progressBar, { width: `${sanitizedSpeed}%` }]} />
                  <Text style={styles.metricValue}>{sanitizedSpeed}%</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="git-network" size={24} color="#ff4c48" />
                <Text style={styles.metricTitle}>Movement Cohesion</Text>
                <View style={styles.progressWrapper}>
                  <View style={[styles.progressBar, { width: `${sanitizedCohesion}%` }]} />
                  <Text style={styles.metricValue}>{sanitizedCohesion}%</Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            <View style={styles.chartsContainer}>
              {/* Bar Chart */}
              <View style={styles.chartCard}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: barChartHtml }}
                  style={[styles.webView, { height: barChartHeight }]}
                  scrollEnabled={false}
                  scalesPageToFit={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onError={(syntheticEvent) => {
                    console.error('Bar Chart WebView Error:', syntheticEvent.nativeEvent);
                  }}
                  onContentSizeChange={(event) => {
                    const newHeight = Math.max(320, event.nativeEvent.contentSize.height);
                    setBarChartHeight(newHeight);
                  }}
                />
              </View>

              {/* Radar Chart */}
              <View style={styles.chartCard}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: radarChartHtml }}
                  style={[styles.webView, { height: radarChartHeight }]}
                  scrollEnabled={false}
                  scalesPageToFit={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onError={(syntheticEvent) => {
                    console.error('Radar Chart WebView Error:', syntheticEvent.nativeEvent);
                  }}
                  onContentSizeChange={(event) => {
                    const newHeight = Math.max(320, event.nativeEvent.contentSize.height);
                    setRadarChartHeight(newHeight);
                  }}
                />
              </View>

              {/* Pie Chart */}
              <View style={styles.chartCard}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: pieChartHtml }}
                  style={[styles.webView, { height: pieChartHeight }]}
                  scrollEnabled={false}
                  scalesPageToFit={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onError={(syntheticEvent) => {
                    console.error('Pie Chart WebView Error:', syntheticEvent.nativeEvent);
                  }}
                  onContentSizeChange={(event) => {
                    const newHeight = Math.max(280, event.nativeEvent.contentSize.height);
                    setPieChartHeight(newHeight);
                  }}
                />
              </View>
            </View>

            {/* Improvement/Regression Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Performance Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, styles.improvementCard]}>
                  <Ionicons name="checkmark-circle" size={32} color="#00ff94" />
                  <Text style={styles.summaryNumber}>{sanitizedImprovements}</Text>
                  <Text style={styles.summaryLabel}>Improvements</Text>
                </View>
                <View style={[styles.summaryCard, styles.regressionCard]}>
                  <Ionicons name="close-circle" size={32} color="#ff6b6b" />
                  <Text style={styles.summaryNumber}>{sanitizedRegressions}</Text>
                  <Text style={styles.summaryLabel}>Regressions</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={styles.restartButton} 
            onPress={handleRestart}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={['#ff4c48', '#0b0a1f']}
            style={styles.playButton}
          >
            <TouchableOpacity 
              style={styles.playButtonInner}
              onPress={togglePlayback}
            >
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={28} 
                color="white" 
              />
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => Alert.alert("Share", "Share functionality coming soon!")}
          >
            <Ionicons name="share" size={20} color="white" />
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginLeft: 15,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  videoContainer: {
    backgroundColor: 'rgba(11, 10, 31, 0.9)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4c48',
    textAlign: 'center',
    marginBottom: 20,
  },
  videoWrapper: {
    height: height * 0.25,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.5)',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 15,
  },
  videoLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  videoSubLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  vsCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff4c48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  vsText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisContainer: {
    backgroundColor: 'rgba(11, 10, 31, 0.9)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  quickStat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    textAlign: 'center',
  },
  metricsGrid: {
    marginBottom: 25,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 35,
    marginTop: -24,
    marginBottom: 10,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    height: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 10,
  },
  metricValue: {
    position: 'absolute',
    right: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  chartsContainer: {
    marginBottom: 25,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  webView: {
    backgroundColor: 'transparent',
  },
  summaryContainer: {
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4c48',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  summaryCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    minWidth: 120,
    borderWidth: 2,
  },
  improvementCard: {
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderColor: 'rgba(0, 255, 148, 0.3)',
  },
  regressionCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 10, 31, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 76, 72, 0.3)',
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff4c48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
});