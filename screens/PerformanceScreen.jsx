import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useCallback } from 'react';

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [pastModalVisible, setPastModalVisible] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [pastVideoUri, setPastVideoUri] = useState(null);

  const redirect = useCallback(() => {
    if (pastVideoUri && videoUri) {
      navigation.navigate('PerformanceComparisonScreen');
    }
  }, [pastVideoUri, videoUri, navigation]);
  

  const pickVideo = async (setVideoFunction) => {  
    let result = await ImagePicker.launchImageLibraryAsync({  
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
      allowsEditing: true,  
      quality: 1,  
    });  
  
    if (!result.canceled) {  
      setVideoFunction(result.assets[0].uri);  
    }  
  };  

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="black" />
        <Text style={styles.headerTitle}>Performance</Text>
      </TouchableOpacity>

      {/* History Section */}
      <Text style={styles.sectionTitle}>History</Text>
      <View style={styles.historyContainer}>
        <FlatList
          data={[
            { id: '1', image: require('../assets/record-placeholder.png') },
            { id: '2', image: require('../assets/record-placeholder.png') },
            { id: '3', image: require('../assets/record-placeholder.png') },
            { id: '4', image: require('../assets/record-placeholder.png') },
          ]}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.recordItem} onPress={() => navigation.navigate('PerformanceComparisonScreen')}>
              <Image source={item.image} style={styles.recordImage} />
              <Text style={styles.recordText}>RECORD</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Improvement Section */}
      <Text style={styles.sectionTitle}>Improvement</Text>
      <View style={styles.improvementContainer}>
      <TouchableOpacity onPress={redirect}>  
        <Image  
          source={require('../assets/record-placeholder.png')} 
          style={{ width: 100, height: 100}}   
        />  
      </TouchableOpacity>  
        <Text style={styles.compareText}>Compare Past vs. Present Movements</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => setPastModalVisible(true)}>
            <Text style={styles.buttonText}>PAST</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>NEW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for NEW Video Upload */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload a new video</Text>

            {videoUri ? (
              <Video source={{ uri: videoUri }} style={styles.videoPreview} useNativeControls resizeMode="contain" />
            ) : (
              <Image source={require('../assets/record-placeholder.png')} style={styles.modalImage} />
            )}

            <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo(setVideoUri)}>
              <Text style={styles.uploadButtonText}>Select Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proceedButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for PAST Video Upload */}
      <Modal animationType="fade" transparent={true} visible={pastModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setPastModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload past video</Text>

            {pastVideoUri ? (
              <Video source={{ uri: pastVideoUri }} style={styles.videoPreview} useNativeControls resizeMode="contain" />
            ) : (
              <Image source={require('../assets/record-placeholder.png')} style={styles.modalImage} />
            )}

            <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo(setPastVideoUri)}>
              <Text style={styles.uploadButtonText}>Select Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proceedButton} onPress={() => setPastModalVisible(false)}>
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 35 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
  historyContainer: { alignItems: 'center' },
  recordItem: { backgroundColor: '#D3D3D3', width: 120, height: 120, margin: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  recordImage: { width: 80, height: 60, resizeMode: 'contain' },
  recordText: { fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  improvementContainer: { backgroundColor: '#D3D3D3', borderRadius: 10, margin: 15, padding: 15, alignItems: 'center' },
  graphImage: { width: '100%', height: 100, resizeMode: 'contain' },
  compareText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%' },
  button: { backgroundColor: 'black', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, margin: 5 },
  buttonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', width: 300, padding: 20, borderRadius: 10, alignItems: 'center' },
  closeButton: { alignSelf: 'flex-end' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  modalImage: { width: 100, height: 100, resizeMode: 'contain', marginVertical: 10 },
  videoPreview: { width: 250, height: 150, borderRadius: 10, marginVertical: 10 },
  uploadButton: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, marginVertical: 5 },
  uploadButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  proceedButton: { backgroundColor: 'black', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, marginTop: 10 },
  proceedButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
});
