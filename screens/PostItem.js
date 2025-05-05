import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkUserLike, toggleLike, getLikeCount, getCommentsCount, getUserId } from '../lib/AppwriteService';
import { DATABASE_ID, COLLECTIONS } from '../lib/AppwriteService';
import DEFAULT_AVATAR from '../assets/avatar.png';

// Add your Appwrite project ID and endpoint (should match AppwriteService.js)
const PROJECT_ID = '67d0bb27002cfc0b22d2'; // Replace with your actual project ID
const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; // Replace if different

const PostItem = ({ post, navigation }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  const loadData = async () => {
    try {
      const userId = await getUserId();
      setIsLiked(await checkUserLike(post.$id, userId));
      setLikeCount(await getLikeCount(post.$id));
      setCommentCount(await getCommentsCount(post.$id));
      
      // Load avatar URL if available
      if (post.user?.avatar) {
        setLoadingAvatar(true);
        try {
          // Construct direct download URL for the avatar
          const url = `${API_ENDPOINT}/storage/buckets/profile_images/files/${post.user.avatar}/view?project=${PROJECT_ID}`;
          setAvatarUrl(url);
        } catch (error) {
          console.log('Error getting avatar URL:', error);
          setAvatarUrl(null);
        } finally {
          setLoadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('Error loading post data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [post.$id]);

  const handleLike = async () => {
    try {
      const userId = await getUserId();
      const newLikeCount = await toggleLike(post.$id, userId);
      setLikeCount(newLikeCount);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {loadingAvatar ? (
          <ActivityIndicator size="small" style={styles.avatar} />
        ) : (
          <Image 
            source={avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR}
            style={styles.avatar}
            defaultSource={DEFAULT_AVATAR}
            onError={(e) => {
              console.log('Failed to load avatar:', e.nativeEvent.error);
              setAvatarUrl(null);
            }}
          />
        )}
        <Text style={styles.username}>{post.user?.name}</Text>
      </View>
      
      <Text style={styles.content}>{post.content}</Text>
      
      {post.imageUrl && (
        <Image 
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? "#ff0000" : "#000"} 
          />
          <Text style={styles.actionText}>{likeCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('PostDetail', { 
            postId: post.$id,
            onGoBack: loadData
          })}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#000" />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    marginBottom: 10,
    fontSize: 15,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
  },
});

export default PostItem;