import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // You can use FontAwesome icons

export default function PostCard({ userName, profileImage, postText, postImage }) {
  return (
    <View style={styles.card}>
      {/* Profile Image */}
      <View style={styles.profileContainer}>
        <Image
          source={profileImage}  // Image passed as a prop
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{userName}</Text>
      </View>

      {/* Post Text */}
      <Text style={styles.postText}>{postText}</Text>

      {/* Post Image */}
      <View style={styles.imageContainer}>
        <Image
          source={postImage}  // Image passed as a prop
          style={styles.postImage}
        />
      </View>

      {/* Icons for like and comment */}
      <View style={styles.iconContainer}>
        <TouchableOpacity style={styles.icon}>
          <Icon name="heart" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.icon}>
          <Icon name="comment" size={20} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    width: '90%',
    alignSelf: 'center',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  postText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
  },
  imageContainer: {
    backgroundColor: '#ddd',
    height: 200,
    marginBottom: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  icon: {
    marginRight: 20,
  },
});
