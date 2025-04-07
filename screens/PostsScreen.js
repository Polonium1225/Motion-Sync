import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { getPosts } from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PostsScreen = () => {
  const [posts, setPosts] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const loadPosts = async () => {
      const fetchedPosts = await getPosts();
      setPosts(fetchedPosts);
    };
    loadPosts();
  }, []);

  const renderPost = ({ item }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { postId: item.$id })}
    >
      <View style={styles.postHeader}>
        <Image source={{ uri: item.user?.avatar }} style={styles.avatar} />
        <Text style={styles.username}>{item.user?.name}</Text>
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
      <View style={styles.postFooter}>
        <View style={styles.interactionButton}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.interactionText}>{item.likes}</Text>
        </View>
        <View style={styles.interactionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.interactionText}>{item.comments?.length || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
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
    marginBottom: 16,
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
});

export default PostsScreen;