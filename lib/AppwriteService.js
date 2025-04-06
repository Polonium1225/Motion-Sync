import { Client, Account, Databases, Permission, Role, Query, ID } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('67d0bb27002cfc0b22d2');

const account = new Account(client);
const databasesClient = new Databases(client);
const DATABASE_ID = '67d0bba1000e9caec4f2'; 
const realtime = client;

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
  }
};

// Helper functions
const getUserConversations = async (userId) => {
  try {
    // Get all conversations instead of using Query.or which might be causing issues
    const response = await databases.listDocuments(
      DATABASE_ID,
      '67edc4ef0032ae87bfe4'
    );
    
    // Filter on the client side
    return response.documents.filter(doc => 
      doc.participant1 === userId || doc.participant2 === userId
    );
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
  DATABASE_ID
};