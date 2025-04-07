import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { saveHistory, getUserHistory , getUserId } from '../lib/AppwriteService';


export default function PerformanceScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [pastModalVisible, setPastModalVisible] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [pastVideoUri, setPastVideoUri] = useState(null);
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);

  

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const userId = await getUserId();
        setUserId(userId);
        const userHistory = await getUserHistory(userId);  
        setHistory(userHistory);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };
    fetchHistory();
  }, []);

  const redirect = useCallback(() => {
    if (pastVideoUri && videoUri) {
      saveHistory(userId, pastVideoUri, videoUri);
      console.log('History saved:', { userId, pastVideoUri, videoUri });
      navigation.navigate('PerformanceComparisonScreen' , { videoUri, pastVideoUri });
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
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.headerTitle}>Performance</Text>
      </TouchableOpacity>

      {/* History Section */}  
      <Text style={styles.sectionTitle}>History</Text>  
      <View style={styles.historyContainer}>  
        <FlatList  
          data={history}  
          keyExtractor={(item) => item.$id}  
          numColumns={2}  
          renderItem={({ item }) => (  
            <TouchableOpacity style={styles.recordItem} onPress={() => navigation.navigate('PerformanceComparisonScreen', { videoUri: item.newVideoUri, pastVideoUri: item.pastVideoUri })}>
              <Text style={styles.recordText}>RECORD</Text>
              <Text style={styles.timestampText}>
                {item.timestamp 
                  ? new Date(item.timestamp).toLocaleString()  
                  : 'Invalid Timestamp'}
              </Text>
            </TouchableOpacity>  
          )}
        />  
      </View>  

      {/* Improvement Section */}
      <Text style={styles.sectionTitle}>Improvement</Text>
      <View style={styles.improvementContainer}>
        <TouchableOpacity onPress={redirect}>  
          <Image  
            source={require('../assets/video.png')} 
            style={{ width: 100, height: 100 ,margin:'auto'}}   
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
          <View style={styles.flexModel}>
            <Text style={styles.modalTitle}>Upload a new video</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
          </View>
            
            {videoUri ? (
              <Video source={{ uri: videoUri }} style={styles.videoPreview} useNativeControls resizeMode="contain" />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.modalImage} />
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
          <View style={styles.flexModel}>
            <Text style={styles.modalTitle}>Upload past video</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setPastModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
            {pastVideoUri ? (
              <Video source={{ uri: pastVideoUri }} style={styles.videoPreview} useNativeControls resizeMode="contain" />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.modalImage} />
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
  container: { flex: 1, backgroundColor: '#22272B' },
  flexModel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#2D343C',
    borderBottomWidth: 1,
    borderBottomColor: '#3A424A'
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginLeft: 15, 
    color: 'white',
    letterSpacing: 0.5
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    marginVertical: 20, 
    color: '#00ffc0',
    paddingHorizontal: 20,
    alignSelf: 'flex-start'
  },
  historyContainer: { 
    paddingHorizontal: 15 
  },
  recordItem: { 
    backgroundColor: '#2D343C', 
    width: '47%', 
    height: 140, 
    margin: 5,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  recordText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#00ffc0',
    marginBottom: 8
  },
  timestampText: { 
    color: '#8D98A3', 
    fontSize: 12, 
    textAlign: 'center',
    paddingHorizontal: 10
  },
  improvementContainer: { 
    backgroundColor: '#2D343C', 
    borderRadius: 20, 
    margin: 20, 
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  },
  compareText: { 
    fontSize: 17, 
    fontWeight: '600', 
    textAlign: 'center', 
    marginVertical: 15, 
    color: 'white',
    lineHeight: 24
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%',
    marginTop: 10
  },
  button: { 
    backgroundColor: '#07A07C', 
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#07A07C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  buttonText: { 
    color: 'white', 
    fontSize: 15, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContainer: { 
    backgroundColor: '#2D343C', 
    width: '90%', 
    padding: 25,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 20, 
    color: 'white',
    textAlign: 'center'
  },
  videoPreview: { 
    width: '100%', 
    height: 180, 
    borderRadius: 16, 
    marginVertical: 15 
  },
  uploadButton: { 
    backgroundColor: '#07A07C',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  uploadButtonText: { 
    color: 'white', 
    fontSize: 15, 
    fontWeight: '700',
    marginLeft: 10
  },
  proceedButton: { 
    backgroundColor: '#22272B', 
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
    alignItems: 'center'
  },
  modalImage: { 
    width: 120, 
    height: 120, 
    resizeMode: 'contain', 
    marginVertical: 20,
    tintColor: '#8D98A3'
  },
});
