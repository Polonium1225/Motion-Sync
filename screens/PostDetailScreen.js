import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getPostById, 
  addComment, 
  toggleLike, 
  checkUserLike, 
  getLikeCount,
  getUserId
} from '../lib/AppwriteService';

const DEFAULT_AVATAR = require('../assets/avatar.png');

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (route.params?.onGoBack) {
        route.params.onGoBack();
      }
    };
  }, [route.params?.onGoBack]); // Add dependency here

  useEffect(() => {
    const loadPost = async () => {
      try {
        const postData = await getPostById(postId);
        setPost(postData);
        
        const userId = await getUserId();
        setIsLiked(await checkUserLike(postId, userId));
        setLikeCount(await getLikeCount(postId));
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [postId]);

  const renderComment = ({ item }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
  
    return (
      <View style={styles.commentContainer}>
        <Image 
          source={item.user?.avatar ? { uri: item.user.avatar } : DEFAULT_AVATAR}
          style={styles.commentAvatar}
          defaultSource={DEFAULT_AVATAR}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.user?.name || 'Anonymous'}</Text>
            <Text style={styles.commentDate}>
              {formatDate(item.$createdAt)}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const handleLike = async () => {
    try {
      const userId = await getUserId();
      const newLikeCount = await toggleLike(postId, userId);
      setLikeCount(newLikeCount);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    
    try {
      setCommentLoading(true);
      const userId = await getUserId();
      const newComment = await addComment(postId, userId, comment);
      
      if (newComment) {
        setPost(prev => ({
          ...prev,
          comments: [...prev.comments, {
            ...newComment,
            $createdAt: new Date().toISOString(),
            user: newComment.user // This now includes the avatar URL
          }]
        }));
        setComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading || !post) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.postContainer}>
      <View style={styles.header}>
        <Image 
          source={post.user?.avatar ? { uri: post.user.avatar } : DEFAULT_AVATAR}
          style={styles.avatar}
          defaultSource={DEFAULT_AVATAR}
        />
        <Text style={styles.username}>{post.user?.name}</Text>
      </View>
        
        <Text style={styles.content}>{post.content}</Text>
        
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? "#ff0000" : "#000"} 
            />
            <Text style={styles.actionText}>{likeCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={post.comments}
        renderItem={renderComment}
        keyExtractor={item => item.$id}
        style={styles.commentsList}
      />
      
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          value={comment}
          onChangeText={setComment}
        />
        <TouchableOpacity onPress={handleComment} disabled={commentLoading}>
          {commentLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="send" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D343C',
    padding: 15,
  },
  postContainer: {
    marginBottom: 20,
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
  actions: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#888',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  commentsList: {
    flex: 1,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
});

export default PostDetailScreen;