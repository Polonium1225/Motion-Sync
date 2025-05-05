import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import PostItem from '../screens/PostItem'
import { getPostsWithUsers } from '../lib/AppwriteService';

const PostScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostItem post={item} navigation={navigation} />}
        keyExtractor={item => item.$id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default PostScreen;