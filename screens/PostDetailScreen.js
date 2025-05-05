import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getPostById, 
  addComment, 
  toggleLike, 
  checkUserLike, 
  getLikeCount,
  getUserId
} from '../lib/AppwriteService';

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);  

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

  const refreshComments = async () => {
    try {
      const commentsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        [Query.equal('postId', postId), Query.orderAsc('$createdAt')]
      );
      // Update comments state
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
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
            user: {
              name: 'You',
              avatar: 'https://via.placeholder.com/150'
            }
          }]
        }));
        setComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
   finally {
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
          <Image source={{ uri: post.user?.avatar }} style={styles.avatar} />
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
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Image source={{ uri: item.user?.avatar }} style={styles.commentAvatar} />
            <View style={styles.commentContent}>
              <Text style={styles.commentAuthor}>{item.user?.name}</Text>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
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
  commentsList: {
    flex: 1,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
  },
  commentAuthor: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  commentText: {
    fontSize: 14,
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