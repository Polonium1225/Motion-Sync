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
  ACCOUNTS: '67d0bbf8003206b11780'
};

// Simple wrapper functions without the recursive trap
const databases = {
  listDocuments: async (databaseId, collectionId, queries = []) => {
    try {
      return await databasesClient.listDocuments(databaseId, collectionId, queries);
    } catch (error) {
      console.error("Database list error:", error);
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
  COLLECTIONS,
  userProfiles
};