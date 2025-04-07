import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { getPostById, addComment, likePost } from '../lib/AppwriteService';
import { Ionicons } from '@expo/vector-icons';

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const loadPost = async () => {
      const postData = await getPostById(postId);
      setPost(postData);
    };
    loadPost();
  }, [postId]);

  const handleAddComment = async () => {
    if (commentText.trim()) {
      const newComment = await addComment(postId, 'currentUserId', commentText);
      if (newComment) {
        setPost(prev => ({
          ...prev,
          comments: [...prev.comments, newComment]
        }));
        setCommentText('');
      }
    }
  };

  const handleLike = async () => {
    const updatedPost = await likePost(postId);
    if (updatedPost) {
      setPost(prev => ({ ...prev, likes: updatedPost.likes }));
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentCard}>
      <Image source={{ uri: item.user?.avatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <Text style={styles.commentAuthor}>{item.user?.name}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  if (!post) return null;

  return (
    <View style={styles.container}>
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Image source={{ uri: post.user?.avatar }} style={styles.avatar} />
          <Text style={styles.username}>{post.user?.name}</Text>
        </View>
        <Text style={styles.postContent}>{post.content}</Text>
        <View style={styles.postFooter}>
          <TouchableOpacity style={styles.interactionButton} onPress={handleLike}>
            <Ionicons name={post.likes ? "heart" : "heart-outline"} size={24} color="#e74c3c" />
            <Text style={styles.likeCount}>{post.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={post.comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.commentsList}
      />

      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
        />
        <TouchableOpacity style={styles.commentButton} onPress={handleAddComment}>
          <Ionicons name="send" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    color: '#666',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    height: 48,
    paddingVertical: 12,
  },
  commentButton: {
    marginLeft: 8,
    padding: 8,
  },
  // Add other styles from FeedScreen as needed
});

export default PostDetailScreen;