import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [videoUri, setVideoUri] = useState(null);

  const historyData = [
    { id: '1', image: require('../assets/video.png') },
    { id: '2', image: require('../assets/video.png') },
    { id: '3', image: require('../assets/video.png') },
    { id: '4', image: require('../assets/video.png') },
  ];

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
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
          data={historyData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.recordItem} onPress={() => navigation.navigate('PerformanceComparisonScreen')}>
              <Image source={item.image} style={styles.recordImage} />
              <Text style={styles.recordText}>RECORD</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.flatListContent}
        />
      </View>

      {/* Improvement Section */}
      <Text style={styles.sectionTitle}>Improvement</Text>
      <View style={styles.improvementContainer}>
        <Image source={require('../assets/video.png')} style={styles.graphImage} />
        <Text style={styles.compareText}>Compare Past vs. Present Movements</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>PAST</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>NEW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for Upload */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="white"/>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload video from gallery</Text>
            
            {/* Show video preview if available */}
            {videoUri ? (
              <Video
                source={{ uri: videoUri }}
                style={styles.videoPreview}
                useNativeControls
                resizeMode="contain"
              />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.modalImage} />
            )}
            
            <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
              <Text style={styles.uploadButtonText}>Select Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proceedButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#22272B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 35,
  },
  headerTitle: {
    color:"#fff",
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sectionTitle: {
    color:"#fff",
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
  },
  historyContainer: {
    alignItems: 'center',
  },
  flatListContent: {
    alignItems: 'center',
  },
  recordItem: {
    backgroundColor: '#D3D3D3',
    width: 120,
    height: 120,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  recordImage: {
    width: 80,
    height: 60,
    resizeMode: 'contain',
  },
  recordText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  improvementContainer: {
    backgroundColor: '#2D343C',
    borderRadius: 10,
    margin: 15,
    padding: 15,
    alignItems: 'center',
  },
  graphImage: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
  },
  compareText: {
    fontSize: 16,
    color:"#fff",
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  button: {
    backgroundColor: '#07A07C',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 20,
    marginTop: 15,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#22272B',
    width: 300,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalTitle: {
    color:"#01CC97",
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  modalImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginVertical: 10,
  },
  videoPreview: {
    width: 250,
    height: 150,
    borderRadius: 10,
    marginVertical: 10,
  },
  uploadButton: {
      //backgroundColor: '#22272B',
      paddingVertical: 7,
      paddingHorizontal: 25,
      borderColor: "#01CC97",
      borderWidth: 2,
      borderRadius: 30,
      marginTop: 15,
      width: '60%',
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  proceedButton: {
    backgroundColor: 'black',
    width: '60%',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 30,
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
