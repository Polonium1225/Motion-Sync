import { Client, Account, Databases, Storage, Permission, Role, Query, ID } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('67d0bb27002cfc0b22d2');

const account = new Account(client);
const databasesClient = new Databases(client);
const DATABASE_ID = '67d0bba1000e9caec4f2'; 
const realetime = client;
const realtime = {
  subscribe: (channels, callback) => {
    const client = new Client()
      .setEndpoint('https://cloud.appwrite.io/v1')
      .setProject('67d0bb27002cfc0b22d2');
    
    return client.subscribe(channels, callback);
  }
};

const storage = new Storage(client);

// Collection IDs
const COLLECTIONS = {
  USER_PROFILES: 'user_profiles', 
  CONVERSATIONS: '67edc4ef0032ae87bfe4',
  MESSAGES: '67edc5c00017db23e0fa',
  ACCOUNTS: '67d0bbf8003206b11780',
  POSTS: '67f31670001021fbeb98',
  COMMENTS: '67f318fc003778e36bd6',
  LIKES: '67f40d750007b4606a75'
};

const POSTS_BUCKET_ID = 'profile_images'; // bucket in Appwrite
const API_ENDPOINT = 'https://cloud.appwrite.io/v1';
const PROJECT_ID = '67d0bb27002cfc0b22d2';

// Simple wrapper functions without the recursive trap
const databases = {
  listDocuments: async (databaseId, collectionId, queries = []) => {
    try {
      return await databasesClient.listDocuments(databaseId, collectionId, queries);
    } catch (error) {
      console.error("Database list error 1:", error);
      if (error.code === 1008) {
        return { documents: [] };
      }
      throw error;
    }
  },
  
  createDocument: async (databaseId, collectionId, documentId, data, permissions = []) => {
    try {
      return await databasesClient.createDocument(databaseId, collectionId, documentId, data, permissions);
    } catch (error) {
      console.error("Database create error:", error);
      throw error;
    }
  },
  
  updateDocument: async (databaseId, collectionId, documentId, data, permissions = []) => {
    try {
      return await databasesClient.updateDocument(databaseId, collectionId, documentId, data, permissions);
    } catch (error) {
      console.error("Database update error:", error);
      throw error;
    }
  },
  
  getDocument: async (databaseId, collectionId, documentId) => {
    try {
      return await databasesClient.getDocument(databaseId, collectionId, documentId);
    } catch (error) {
      console.error("Database get document error:", error);
      throw error;
    }
  },
  
  deleteDocument: async (databaseId, collectionId, documentId) => {
    try {
      return await databasesClient.deleteDocument(databaseId, collectionId, documentId);
    } catch (error) {
      console.error("Database delete error:", error);
      throw error;
    }
  }
};

// User profile management
const userProfiles = {
  ensureProfile: async (userId) => {
    try {
      // Try to get existing profile
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('userId', userId)]
      );

      if (documents.length > 0) return documents[0];
      // Create new profile if missing
      const user = await account.get();
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        ID.unique(),
        {
          userId: userId,
          name: user.name || 'User',
          status: 'online',
          avatar: 'avatar.png',
          lastSeen: new Date()
        }
      );
    } catch (error) {
      console.error("Profile ensure error:", error);
      throw error;
    }
  },

  updateStatus: async (userId, status, sessionToken = null) => {
    try {
      const now = new Date();
      const clientWithSession = sessionToken ? 
        new Client().setEndpoint('YOUR_ENDPOINT').setProject('YOUR_PROJECT').setJWT(sessionToken) : 
        client;
      
      const db = new Databases(clientWithSession);
      
      const { documents } = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('userId', userId)]
      );
  
      if (documents.length > 0) {
        return await db.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          documents[0].$id,
          { status, lastSeen: now }
        );
      }
      
      // Create profile if missing
      const user = await account.get();
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        ID.unique(),
        {
          userId: userId,
          name: user.name || 'User',
          status: status,
          avatar: 'avatar.png',
          lastSeen: now
        }
      );
    } catch (error) {
      console.error("Status update error:", error);
      throw error;
    }
  },
  
  getProfileByUserId: async (userId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('userId', userId)]
      );
      
      if (response.documents.length > 0) {
        return response.documents[0];
      }
      
      // If no profile exists, create a basic one
      const newProfile = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        ID.unique(),
        {
          userId: userId,
          name: 'Unknown User',
          status: 'offline',
          avatar: 'avatar.png'
        }
      ).catch(e => {
        console.error("Failed to create profile:", e);
        return null;
      });
      
      return newProfile || {
        userId: userId,
        name: 'Unknown User',
        status: 'offline',
        avatar: 'avatar.png'
      };
    } catch (error) {
      console.error("Error getting profile:", error);
      return {
        userId: userId,
        name: 'Unknown User',
        status: 'offline',
        avatar: 'avatar.png'
      };
    }
  },

  safeUpdateStatus: async (userId, status) => {
    try {
      const now = new Date();
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('userId', userId)]
      );

      if (documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          documents[0].$id,
          { 
            status: status,
            lastSeen: now 
          }
        );
        return true;
      }
      return false;
    } catch (error) {
      // Silently ignore all errors
      return false;
    }
  }
};

// Helper functions
const getUserConversations = async (userId) => {
  try {
    if (!userId) {
      console.error("Error: userId is required");
      return [];
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      [
        Query.or([
          Query.equal('participant1', userId),
          Query.equal('participant2', userId)
        ])
      ]
    );
    
    return response.documents;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
};

// File storage helpers
const uploadFile = async (file, bucketId) => {
  try {
    const fileId = ID.unique();
    const result = await storage.createFile(bucketId, fileId, file);
    return fileId;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

const getFilePreview = (bucketId, fileId) => {
  try {
    return storage.getFilePreview(bucketId, fileId);
  } catch (error) {
    console.error("Error getting file preview:", error);
    return null;
  }
};

const deleteFile = async (bucketId, fileId) => {
  try {
    await storage.deleteFile(bucketId, fileId);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Sohaib Part!!

 const saveHistory = async (userId, pastVideoUri, newVideoUri) => {
   try {
     const response = await databases.createDocument(
       DATABASE_ID,
       '67df4dc3003741c2098b',
       ID.unique(),
       {
         userId,
         pastVideoUri,
         newVideoUri,
         timestamp: new Date().toISOString(),
       }
     );
      console.log("History saved:", response);
     return response;
   } catch (error) {
     console.error("Error saving history gg:", error);
   }
 };
 
 const getUserHistory = async (userId) => {
   try {
     const response = await databases.listDocuments(DATABASE_ID, '67df4dc3003741c2098b', [
       Query.equal("userId", userId)
     ]);
     console.log("History fetched:", response.documents);
     return response.documents;
   } catch (error) {
     console.error("Error fetching history hh:", error);
     return [];
   }
 };
 
 export const getUserId = async () => {
  try {
    const user = await account.get();
    return user.$id;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
};

 const getVideo = async (videoId) => {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        '67df4dc3003741c2098b',
        videoId
      );
      console.log("Video fetched:", response);
      return response;
    } catch (error) {
      console.error("Error fetching video:", error);
      return null;
    }
  };

  const checkUserLike = async (postId, userId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LIKES,
        [
          Query.equal('postId', postId),
          Query.equal('userId', userId)
        ]
      );
      return response.documents.length > 0;
    } catch (error) {
      console.error("Error checking like:", error);
      return false;
    }
  };
  const toggleLike = async (postId, userId) => {
    try {
      // Check if user already liked
      const existingLikes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LIKES,
        [
          Query.equal('postId', postId),
          Query.equal('userId', userId)
        ]
      );
  
      if (existingLikes.documents.length > 0) {
        // Unlike the post
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.LIKES,
          existingLikes.documents[0].$id
        );
      } else {
        // Like the post
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.LIKES,
          ID.unique(),
          {
            postId,
            userId,
            likes: 1,
          }
        );
      }
  
      // Get updated like count
      const likesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LIKES,
        [Query.equal('postId', postId)]
      );
  
      return likesResponse.documents.length;
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  };

  export const getLikeCount = async (postId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LIKES,
        [Query.equal('postId', postId)]
      );
      return response.documents.length;
    } catch (error) {
      console.error("Error getting like count:", error);
      return 0;
    }
  };

  export const getCommentsCount = async (postId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        [Query.equal('postId', postId)]
      );
      return response.documents.length;
    } catch (error) {
      console.error("Error getting comments count:", error);
      return 0;
    }
  };
  // const getPostsWithUsers = async () => {
  //   try {
  //     const postsResponse = await databases.listDocuments(
  //       DATABASE_ID,
  //       COLLECTIONS.POSTS,
  //       [Query.orderDesc('$createdAt')]
  //     );
  
  //     const postsWithUsers = await Promise.all(
  //       postsResponse.documents.map(async post => {
  //         const user = await userProfiles.getProfileByUserId(post.UserId);
  //         const likeCount = await getLikeCount(post.$id);
  //         const commentsCount = await getCommentsCount(post.$id);
  //         return {
  //           ...post,
  //           likeCount,
  //           commentsCount,
  //           user: {
  //             avatar: user.avatar,
  //             name: user.name
  //           }
  //         };
  //       })
  //     );
  
  //     return postsWithUsers;
  //   } catch (error) {
  //     console.error("Error fetching posts with users:", error);
  //     return [];
  //   }
  // };
  
  export const getPostById = async (postId) => {
    try {
      const post = await databases.getDocument(DATABASE_ID, COLLECTIONS.POSTS, postId);
      const postUser = await userProfiles.getProfileByUserId(post.UserId);
      
      const commentsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        [
          Query.equal('postId', postId), 
          Query.orderAsc('$createdAt')
        ]
      );
  
      const likeCount = await getLikeCount(postId);
      
      // Get detailed user info for each comment
      const commentsWithUsers = await Promise.all(
        commentsResponse.documents.map(async (comment) => {
          const commentUser = await userProfiles.getProfileByUserId(comment.userId);
          return {
            ...comment,
            user: commentUser ? {
              name: commentUser.name || 'Anonymous',
              avatar: commentUser.avatar || 'https://via.placeholder.com/150'
            } : {
              name: 'Anonymous',
              avatar: 'https://via.placeholder.com/150'
            }
          };
        })
      );
  
      return { 
        ...post, 
        comments: commentsWithUsers,
        likeCount,
        user: { 
          avatar: postUser?.avatar || 'https://via.placeholder.com/150', 
          name: postUser?.name || 'Unknown User'
        } 
      };
    } catch (error) {
      console.error("Error fetching post:", error);
      return null;
    }
  };
  
  export const addComment = async (postId, userId, content) => {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        ID.unique(),
        {
          postId,
          userId,
          content,
        }
      );
      
      // Get user profile to include in the immediate UI update
      const user = await userProfiles.getProfileByUserId(userId);
      return {
        ...response,
        user: {
          name: user?.name || 'You',
          avatar: user?.avatar || 'https://via.placeholder.com/150'
        }
      };
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  };
  
// const createPost = async (UserId, content, imageUrl = null) => {
//   try {
//     return await databases.createDocument(
//       DATABASE_ID,
//       COLLECTIONS.POSTS,
//       ID.unique(),
//       {
//         UserId,
//         content,
//         imageUrl,
//       }
//     );
//   } catch (error) {
//     console.error("Error creating post:", error);
//     return null;
//   }
// };

//////////// Post Update By Ali////////

export const getPostsWithUsers = async () => {
  try {
    const posts = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.POSTS,
      [Query.orderDesc('$createdAt')]
    );

    return await Promise.all(posts.documents.map(async post => {
      const user = await userProfiles.getProfileByUserId(post.UserId);
      return {
        ...post,
        user: {
          name: user.name,
          avatar: user.avatar
        },
        // No need to modify imageUrl here as it's already stored
      };
    }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

export const createPost = async (userId, content, imageFileId = null) => {
  try {
    // Generate the image URL if we have a file ID
    const imageUrl = imageFileId 
      ? `${API_ENDPOINT}/storage/buckets/${POSTS_BUCKET_ID}/files/${imageFileId}/view?project=${PROJECT_ID}`
      : null;

    console.log('Creating post with data:', {
      UserId: userId,
      content,
      imageUrl
    });

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.POSTS,
      ID.unique(),
      {
        UserId: userId,  // Must match your exact attribute name
        content,
        imageUrl  // Only include fields that exist in your posts collection
      }
    );
    return response.$id;
  } catch (error) {
    console.error('Database create error:', error);
    throw error;
  }
};

export const uploadPostImage = async (imageObject) => {
  try {
    console.log('Starting post image upload...');
    
    // Create FormData object
    const formData = new FormData();
    formData.append('fileId', ID.unique());
    formData.append('file', {
      uri: imageObject.uri,
      name: imageObject.fileName || `post_${Date.now()}.jpg`,
      type: imageObject.mimeType || 'image/jpeg'
    });

    console.log('FormData prepared:', {
      uri: imageObject.uri,
      type: imageObject.mimeType,
      name: imageObject.fileName
    });

    // Make direct HTTP request to Appwrite
    const response = await fetch(
      `${API_ENDPOINT}/storage/buckets/${POSTS_BUCKET_ID}/files`,
      {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          // Don't set Content-Type - let the browser set it with boundary
        },
        body: formData,
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Upload failed');
    }

    console.log('Upload successful:', result.$id);
    return result.$id;
  } catch (error) {
    console.error('Upload error:', {
      message: error.message,
      stack: error.stack,
      imageObject: imageObject
    });
    throw error;
  }
};

export const getPostImageUrl = (fileId) => {
  if (!fileId) return null;
  return `${API_ENDPOINT}/storage/buckets/${POSTS_BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
};
export { 
  account, 
  databases, 
  Query, 
  ID, 
  Permission, 
  Role,
  getUserConversations,
  DATABASE_ID,
  uploadFile,
  getFilePreview,
  deleteFile,

  saveHistory,
  getUserHistory,

  userProfiles,
  COLLECTIONS,

  getVideo,

  toggleLike,
  checkUserLike,
  realtime,
  storage,

};