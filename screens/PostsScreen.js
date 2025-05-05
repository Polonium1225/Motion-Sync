import React, { useEffect, useState , useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation ,useFocusEffect  } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPostsWithUsers, getPostImageUrl  } from '../lib/AppwriteService';

const PostsScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadPosts = async () => {
        try {
          const fetchedPosts = await getPostsWithUsers();
          if (isActive) {
            setPosts(fetchedPosts);
          }
        } catch (error) {
          console.error('Error loading posts:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadPosts();
      return () => { isActive = false; };
    }, [])
  );

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const fetchedPosts = await getPostsWithUsers();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    }; 
    loadPosts();
  }, []);

  const renderPost = ({ item }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { 
        postId: item.$id,
        initialLikeCount: item.likeCount ,
        initialComments: item.commentsCount || 0,
      })}
    >
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: item.user?.avatar || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <Text style={styles.username}>{item.user?.name || 'Unknown User'}</Text>
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.imageUrl && (
        <Image 
        source={{ uri: getPostImageUrl(item.imageId) }} 
        style={styles.postImage}
        resizeMode="cover"
        defaultSource={require('../assets/image_placeholder.png')} // Add a placeholder
      />
      )}
      <View style={styles.postFooter}>
        <View style={styles.interactionButton}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.interactionText}>{item.likeCount || 0}</Text>
        </View>
        <View style={styles.interactionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.interactionText}>{item.commentsCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#05907A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Posts</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#05907A',
    padding: 8,
    borderRadius: 20,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    color: '#333',
  },
  postFooter: {
    flexDirection: 'row',
    gap: 24,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionText: {
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16
  }
});
// Keep all your existing styles from previous version
export default PostsScreen;