import { Client, Account, Databases, Permission, Role, Query, ID } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('67d0bb27002cfc0b22d2');

const account = new Account(client);
const databasesClient = new Databases(client);
const DATABASE_ID = '67d0bba1000e9caec4f2'; 
const realtime = client;

// Collection IDs
const COLLECTIONS = {
  USER_PROFILES: 'user_profiles', 
  CONVERSATIONS: '67edc4ef0032ae87bfe4',
  MESSAGES: '67edc5c00017db23e0fa',
  ACCOUNTS: '67d0bbf8003206b11780',
  POSTS: '67f31670001021fbeb98',
  COMMENTS: '67f318fc003778e36bd6',
};

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

  updateStatus: async (userId, status) => {
    try {
      const now = new Date();
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('userId', userId)]
      );

      if (documents.length > 0) {
        return await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          documents[0].$id,
          { 
            status: status,
            lastSeen: now
          }
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
 
 const getUserId = async () => {
   try {
     const response = await account.get();
     console.log("User ID fetched:", response.$id);
     return response.$id;
   } catch (error) {
     console.error("Error fetching user ID:", error);
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

  const getPosts = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.POSTS,
        [Query.orderDesc('$createdAt')]
      );
      console.log("Posts fetched:", response.documents);
      return response.documents;
    } catch (error) {
      console.error("Error fetching posts:", error);
      return [];
    }
  };
  
  const getPostById = async (postId) => {
    try {
      const post = await databases.getDocument(DATABASE_ID, COLLECTIONS.POSTS, postId);
      const comments = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        [Query.equal('postId', postId), Query.orderAsc('$createdAt')]
      );
      return { ...post, comments: comments.documents };
    } catch (error) {
      console.error("Error fetching post:", error);
      return null;
    }
  };
  
  const addComment = async (postId, userId, content) => {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        ID.unique(),
        {
          postId,
          userId,
          content,
        }
      );
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  };
  
  const likePost = async (postId) => {
    try {
      const post = await databases.getDocument(DATABASE_ID, COLLECTIONS.POSTS, postId);
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.POSTS,
        postId,
        { likes: post.likes + 1 }
      );
    } catch (error) {
      console.error("Error liking post:", error);
      return null;
    }
  };
// Add post creation function
const createPost = async (userId, content, imageUrl = null) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.POSTS,
      ID.unique(),
      {
        userId,
        content,
        imageUrl,
        likes: 0,
        comments: [],
      }
    );
  } catch (error) {
    console.error("Error creating post:", error);
    return null;
  }
};
export { 
  account, 
  databases, 
  realtime,
  Query, 
  ID, 
  Permission, 
  Role,
  getUserConversations,
  DATABASE_ID,
  saveHistory,
  getUserHistory,
  getUserId,
  userProfiles,
  COLLECTIONS,
  getPosts,
  getPostById,
  addComment,
  likePost,
  getVideo,
  createPost
};