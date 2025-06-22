import React, { useRef, useState } from 'react';
import Colors from '../constants/Colors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';

const { height, width } = Dimensions.get('window');

export default function PerformanceComparisonScreen({ route, navigation }) {
  const { videoUri, pastVideoUri, similarity, smoothness, speed, cohesion, accuracy, improvements, regressions } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefPast = useRef(null);
  const videoRefNew = useRef(null);
  const [barChartHeight, setBarChartHeight] = useState(300);
  const [radarChartHeight, setRadarChartHeight] = useState(300);
  const [doughnutChartHeight, setDoughnutChartHeight] = useState(300);
  const [pieChartHeight, setPieChartHeight] = useState(300);

  // Handle missing videos
  if (!videoUri || !pastVideoUri) {
    Alert.alert(
      "Missing Videos",
      "One or more videos are missing. Please go back and try again.",
      [{ text: "Go Back", onPress: () => navigation.goBack() }]
    );
  }

  const togglePlayback = async () => {
    if (isPlaying) {
      await videoRefPast.current.pauseAsync();
      await videoRefNew.current.pauseAsync();
    } else {
      await videoRefPast.current.playAsync();
      await videoRefNew.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = async () => {
    await videoRefPast.current.pauseAsync();
    await videoRefNew.current.pauseAsync();
    await videoRefPast.current.setPositionAsync(0);
    await videoRefNew.current.setPositionAsync(0);
    setIsPlaying(false);
  };

  // Sanitize data
  const sanitizedSimilarity = Math.min(100, Math.max(0, similarity ?? 75));
  const sanitizedSmoothness = Math.min(100, Math.max(0, smoothness ?? 60));
  const sanitizedSpeed = Math.min(100, Math.max(0, speed ?? 65));
  const sanitizedCohesion = Math.min(100, Math.max(0, cohesion ?? 70));
  const sanitizedAccuracy = Math.min(100, Math.max(0, accuracy ?? 60));
  const sanitizedImprovements = Math.max(0, improvements ?? 2);
  const sanitizedRegressions = Math.max(0, regressions ?? 1);

  console.log('Chart Data:', {
    similarity: sanitizedSimilarity,
    smoothness: sanitizedSmoothness,
    speed: sanitizedSpeed,
    cohesion: sanitizedCohesion,
    accuracy: sanitizedAccuracy,
    improvements: sanitizedImprovements,
    regressions: sanitizedRegressions
  });

  // HTML for Bar Chart
  const barChartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
      <style>
        body {
          background-color: ${Colors.surfaceDark};
          color: ${Colors.textPrimary};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 10px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 300px !important;
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          color: ${Colors.textSecondary};
          margin-bottom: 10px;
          text-align: center;
        }
        .error {
          color: ${Colors.primary};
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Performance Metrics (Bar)</div>
      <canvas id="barChart" width="${width - 72}" height="300"></canvas>
      <div id="error" class="error"></div>
      <script>
        console.log = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message }));
        };
        console.error = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message }));
        };
        window.onload = function() {
          try {
            const data = {
              similarity: ${sanitizedSimilarity},
              smoothness: ${sanitizedSmoothness},
              speed: ${sanitizedSpeed},
              cohesion: ${sanitizedCohesion},
              accuracy: ${sanitizedAccuracy}
            };
            console.log('Bar Chart Data:', data);
            const ctx = document.getElementById('barChart').getContext('2d');
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ['Similarity', 'Smoothness', 'Speed', 'Cohesion', 'Accuracy'],
                datasets: [{
                  label: 'Metrics (%)',
                  data: [data.similarity, data.smoothness, data.speed, data.cohesion, data.accuracy],
                  backgroundColor: '${Colors.primary}',
                  borderColor: '${Colors.border}',
                  borderWidth: 1
                }]
              },
              options: {
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '${Colors.textPrimary}', callback: value => value + '%' },
                    grid: { color: '${Colors.border}' }
                  },
                  x: {
                    ticks: { color: '${Colors.textPrimary}' },
                    grid: { display: false }
                  }
                },
                plugins: { legend: { display: false } },
                maintainAspectRatio: false,
                animation: false
              }
            });
          } catch (e) {
            console.error('Bar Chart Error:', e);
            document.getElementById('error').innerText = 'Failed to load chart: ' + e.message;
          }
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
          background-color: ${Colors.surfaceDark};
          color: ${Colors.textPrimary};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 10px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 300px !important;
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          color: ${Colors.textSecondary};
          margin-bottom: 10px;
          text-align: center;
        }
        .error {
          color: ${Colors.primary};
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Performance Metrics (Radar)</div>
      <canvas id="radarChart" width="${width - 72}" height="300"></canvas>
      <div id="error" class="error"></div>
      <script>
        console.log = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message }));
        };
        console.error = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message }));
        };
        window.onload = function() {
          try {
            const data = {
              similarity: ${sanitizedSimilarity},
              smoothness: ${sanitizedSmoothness},
              speed: ${sanitizedSpeed},
              cohesion: ${sanitizedCohesion},
              accuracy: ${sanitizedAccuracy}
            };
            console.log('Radar Chart Data:', data);
            const ctx = document.getElementById('radarChart').getContext('2d');
            new Chart(ctx, {
              type: 'radar',
              data: {
                labels: ['Similarity', 'Smoothness', 'Speed', 'Cohesion', 'Accuracy'],
                datasets: [{
                  label: 'Metrics',
                  data: [data.similarity, data.smoothness, data.smoothness, data.cohesion, data.accuracy],
                  backgroundColor: 'rgba(255, 0, 62, 0.2)',
                  borderColor: '${Colors.primary}',
                  borderWidth: 2,
                  pointBackgroundColor: '${Colors.primary}'
                }]
              },
              options: {
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '${Colors.textPrimary}', callback: value => value + '%' },
                    grid: { color: '${Colors.border}' },
                    angleLines: { color: '${Colors.border}' },
                    pointLabels: { color: '${Colors.textPrimary}' }
                  }
                },
                plugins: { legend: { display: false } },
                maintainAspectRatio: false,
                animation: false
              }
            });
          } catch (e) {
            console.error('Radar Chart Error:', e);
            document.getElementById('error').innerText = 'Failed to load chart: ' + e.message;
          }
        };
      </script>
    </body>
    </html>
  `;

  // HTML for Doughnut Chart
  const doughnutChartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
      <style>
        body {
          background-color: ${Colors.surfaceDark};
          color: ${Colors.textPrimary};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 10px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 300px !important;
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          color: ${Colors.textSecondary};
          margin-bottom: 10px;
          text-align: center;
        }
        .error {
          color: ${Colors.primary};
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Performance Metrics (Doughnut)</div>
      <canvas id="doughnutChart" width="${width - 72}" height="300"></canvas>
      <div id="error" class="error"></div>
      <script>
        console.log = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message }));
        };
        console.error = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message }));
        };
        window.onload = function() {
          try {
            const data = {
              similarity: ${sanitizedSimilarity},
              smoothness: ${sanitizedSmoothness},
              speed: ${sanitizedSpeed},
              cohesion: ${sanitizedCohesion},
              accuracy: ${sanitizedAccuracy}
            };
            console.log('Doughnut Chart Data:', data);
            const ctx = document.getElementById('doughnutChart').getContext('2d');
            new Chart(ctx, {
              type: 'doughnut',
              data: {
                labels: ['Similarity', 'Smoothness', 'Speed', 'Cohesion', 'Accuracy'],
                datasets: [{
                  data: [data.similarity, data.smoothness, data.speed, data.cohesion, data.accuracy],
                  backgroundColor: ['${Colors.primary}', '#B3002D', '#CC3366', '#E64D88', '#FF66AA'],
                  borderColor: '${Colors.surfaceDark}',
                  borderWidth: 1
                }]
              },
              options: {
                plugins: {
                  legend: {
                    labels: { color: '${Colors.textPrimary}', font: { size: 14 } },
                    position: 'bottom'
                  }
                },
                maintainAspectRatio: false,
                animation: false
              }
            });
          } catch (e) {
            console.error('Doughnut Chart Error:', e);
            document.getElementById('error').innerText = 'Failed to load chart: ' + e.message;
          }
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
          background-color: ${Colors.surfaceDark};
          color: ${Colors.textPrimary};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 10px;
        }
        canvas {
          border-radius: 16px;
          width: 100% !important;
          height: 300px !important;
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          color: ${Colors.textSecondary};
          margin-bottom: 10px;
          text-align: center;
        }
        .error {
          color: ${Colors.primary};
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="title">Improvements vs Regressions</div>
      <canvas id="pieChart" width="${width - 72}" height="300"></canvas>
      <div id="error" class="error"></div>
      <script>
        console.log = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message }));
        };
        console.error = function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message }));
        };
        window.onload = function() {
          try {
            const data = {
              improvements: ${sanitizedImprovements},
              regressions: ${sanitizedRegressions}
            };
            console.log('Pie Chart Data:', data);
            const ctx = document.getElementById('pieChart').getContext('2d');
            new Chart(ctx, {
              type: 'pie',
              data: {
                labels: ['Improvements', 'Regressions'],
                datasets: [{
                  data: [data.improvements, data.regressions],
                  backgroundColor: ['${Colors.primary}', '${Colors.accentBlue}'],
                  borderColor: '${Colors.surfaceDark}',
                  borderWidth: 1
                }]
              },
              options: {
                plugins: {
                  legend: {
                    labels: { color: '${Colors.textPrimary}', font: { size: 14 } },
                    position: 'bottom'
                  }
                },
                maintainAspectRatio: false,
                animation: false
              }
            });
          } catch (e) {
            console.error('Pie Chart Error:', e);
            document.getElementById('error').innerText = 'Failed to load chart: ' + e.message;
          }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, {backgroundColor: Colors.background}]}>
      {/* Header */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.goBack()}
      >
        <LinearGradient
          colors={[Colors.surfaceDark, 'rgba(31,34,41,0.6)']}
          style={styles.header}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} style={styles.backIcon} />
          <Text style={[styles.title, {color: Colors.textPrimary}]}>Performance Analysis</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Video Comparison Container */}
        <View style={styles.videoContainer}>
          {/* Past Video */}
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRefPast}
              source={{ uri: pastVideoUri }}
              style={styles.video}
              resizeMode="cover"
              isLooping
              onError={(error) => {
                console.error("Video loading error (past):", error);
                Alert.alert("Video Error", "Could not load past performance video.");
              }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={styles.videoLabel}
            >
              <Text style={[styles.videoLabelText, {color: Colors.textPrimary}]}>PAST PERFORMANCE</Text>
            </LinearGradient>
          </View>

          {/* New Video */}
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRefNew}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode="cover"
              isLooping
              onError={(error) => {
                console.error("Video loading error (new):", error);
                Alert.alert("Video Error", "Could not load current performance video.");
              }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={styles.videoLabel}
            >
              <Text style={[styles.videoLabelText, {color: Colors.textPrimary}]}>CURRENT PERFORMANCE</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Analysis Section */}
        <View style={[styles.statsContainer, {backgroundColor: Colors.surfaceDark}]}>
          {/* Pose Similarity */}
          <View style={styles.metricContainer}>
            <Text style={[styles.metricTitle, {color: Colors.textSecondary}]}>Pose Similarity</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: `${sanitizedSimilarity}%`, backgroundColor: Colors.primary }]} />
              <Text style={[styles.metricValue, {color: Colors.textPrimary}]}>{sanitizedSimilarity}%</Text>
            </View>
          </View>

          {/* Motion Smoothness */}
          <View style={styles.metricContainer}>
            <Text style={[styles.metricTitle, {color: Colors.textSecondary}]}>Motion Smoothness</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: `${sanitizedSmoothness}%`, backgroundColor: Colors.primary }]} />
              <Text style={[styles.metricValue, {color: Colors.textPrimary}]}>{sanitizedSmoothness}%</Text>
            </View>
          </View>

          {/* Speed */}
          <View style={styles.metricContainer}>
            <Text style={[styles.metricTitle, {color: Colors.textSecondary}]}>Movement Speed</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: `${sanitizedSpeed}%`, backgroundColor: Colors.primary }]} />
              <Text style={[styles.metricValue, {color: Colors.textPrimary}]}>{sanitizedSpeed}%</Text>
            </View>
          </View>

          {/* Cohesion */}
          <View style={styles.metricContainer}>
            <Text style={[styles.metricTitle, {color: Colors.textSecondary}]}>Movement Cohesion</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: `${sanitizedCohesion}%`, backgroundColor: Colors.primary }]} />
              <Text style={[styles.metricValue, {color: Colors.textPrimary}]}>{sanitizedCohesion}%</Text>
            </View>
          </View>

          {/* Accuracy */}
          <View style={styles.metricContainer}>
            <Text style={[styles.metricTitle, {color: Colors.textSecondary}]}>Movement Accuracy</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: `${sanitizedAccuracy}%`, backgroundColor: Colors.primary }]} />
              <Text style={[styles.metricValue, {color: Colors.textPrimary}]}>{sanitizedAccuracy}%</Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: barChartHtml }}
              style={[styles.webView, { height: barChartHeight, backgroundColor: Colors.surfaceDark }, Platform.OS === 'ios' ? { opacity: 0.99 } : {}]}
              scrollEnabled={false}
              scalesPageToFit={true}
              automaticallyAdjustContentInsets={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onLoad={() => console.log('Bar Chart WebView Loading')}
              onLoadEnd={() => console.log('Bar Chart WebView Loaded')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('Bar Chart WebView Error:', nativeEvent);
                Alert.alert('Chart Error', `Failed to load Bar Chart: ${nativeEvent.description}`);
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log(`Bar Chart WebView ${data.type}:`, data.message);
                } catch (e) {
                  console.log('Bar Chart WebView Message:', event.nativeEvent.data);
                }
              }}
              onContentSizeChange={(event) => {
                const newHeight = Math.max(300, event.nativeEvent.contentSize.height);
                console.log('Bar Chart Content Size Change:', newHeight);
                setBarChartHeight(newHeight);
              }}
            />
          </View>

          {/* Radar Chart */}
          <View style={styles.chartContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: radarChartHtml }}
              style={[styles.webView, { height: radarChartHeight, backgroundColor: Colors.surfaceDark }, Platform.OS === 'ios' ? { opacity: 0.99 } : {}]}
              scrollEnabled={false}
              scalesPageToFit={true}
              automaticallyAdjustContentInsets={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onLoad={() => console.log('Radar Chart WebView Loading')}
              onLoadEnd={() => console.log('Radar Chart WebView Loaded')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('Radar Chart WebView Error:', nativeEvent);
                Alert.alert('Chart Error', `Failed to load Radar Chart: ${nativeEvent.description}`);
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log(`Radar Chart WebView ${data.type}:`, data.message);
                } catch (e) {
                  console.log('Radar Chart WebView Message:', event.nativeEvent.data);
                }
              }}
              onContentSizeChange={(event) => {
                const newHeight = Math.max(300, event.nativeEvent.contentSize.height);
                console.log('Radar Chart Content Size Change:', newHeight);
                setRadarChartHeight(newHeight);
              }}
            />
          </View>

          {/* Doughnut Chart */}
          <View style={styles.chartContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: doughnutChartHtml }}
              style={[styles.webView, { height: doughnutChartHeight, backgroundColor: Colors.surfaceDark }, Platform.OS === 'ios' ? { opacity: 0.99 } : {}]}
              scrollEnabled={false}
              scalesPageToFit={true}
              automaticallyAdjustContentInsets={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onLoad={() => console.log('Doughnut Chart WebView Loading')}
              onLoadEnd={() => console.log('Doughnut Chart WebView Loaded')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('Doughnut Chart WebView Error:', nativeEvent);
                Alert.alert('Chart Error', `Failed to load Doughnut Chart: ${nativeEvent.description}`);
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log(`Doughnut Chart WebView ${data.type}:`, data.message);
                } catch (e) {
                  console.log('Doughnut Chart WebView Message:', event.nativeEvent.data);
                }
              }}
              onContentSizeChange={(event) => {
                const newHeight = Math.max(300, event.nativeEvent.contentSize.height);
                console.log('Doughnut Chart Content Size Change:', newHeight);
                setDoughnutChartHeight(newHeight);
              }}
            />
          </View>

          {/* Pie Chart */}
          <View style={styles.chartContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: pieChartHtml }}
              style={[styles.webView, { height: pieChartHeight, backgroundColor: Colors.surfaceDark }, Platform.OS === 'ios' ? { opacity: 0.99 } : {}]}
              scrollEnabled={false}
              scalesPageToFit={true}
              automaticallyAdjustContentInsets={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onLoad={() => console.log('Pie Chart WebView Loading')}
              onLoadEnd={() => console.log('Pie Chart WebView Loaded')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('Pie Chart WebView Error:', nativeEvent);
                Alert.alert('Chart Error', `Failed to load Pie Chart: ${nativeEvent.description}`);
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log(`Pie Chart WebView ${data.type}:`, data.message);
                } catch (e) {
                  console.log('Pie Chart WebView Message:', event.nativeEvent.data);
                }
              }}
              onContentSizeChange={(event) => {
                const newHeight = Math.max(300, event.nativeEvent.contentSize.height);
                console.log('Pie Chart Content Size Change:', newHeight);
                setPieChartHeight(newHeight);
              }}
            />
          </View>

          {/* Improvement/Regression Stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, {backgroundColor: Colors.primaryDeep}]}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
              <Text style={[styles.statText, {color: Colors.textPrimary}]}>{sanitizedImprovements} Improvements</Text>
            </View>
            <View style={[styles.statItem, {backgroundColor: Colors.primaryDeep}]}>
              <Ionicons name="close-circle" size={24} color={Colors.accentBlue} />
              <Text style={[styles.statText, {color: Colors.textPrimary}]}>{sanitizedRegressions} Regressions</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Controls */}
      <View style={[styles.controlsContainer, {backgroundColor: Colors.surfaceDark}]}>
        <TouchableOpacity style={[styles.restartButton, {backgroundColor: Colors.primaryDeep}]} onPress={handleRestart}>
          <Ionicons name="refresh" size={24} color={Colors.textPrimary} />
          <Text style={[styles.buttonText, {color: Colors.textPrimary}]}>Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.playButton, {backgroundColor: Colors.primary}]} onPress={togglePlayback}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: height * 0.14
  },
  header: {
    height: height * 0.12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: height * 0.06,
    zIndex: 2,
  },
  backIcon: {
    marginRight: 15
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  videoContainer: {
    height: height * 0.55,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  videoWrapper: {
    height: '48%',
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    padding: 12,
  },
  videoLabelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statsContainer: {
    padding: 20,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  chartContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  webView: {
    width: width - 72,
    borderRadius: 16,
  },
  metricContainer: {
    marginBottom: 20,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  controlsContainer: {
    height: height * 0.14,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 3,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  playButton: {
    padding: 16,
    borderRadius: 40,
    elevation: 8,
  },
  buttonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
});