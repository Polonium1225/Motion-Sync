import { Client, Account, Databases, Permission, Role, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('67d0bb27002cfc0b22d2');

const account = new Account(client);
const databases = new Databases(client);

const DATABASE_ID = '67d0bba1000e9caec4f2'; 
const realtime = client; 

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
    return response;
  } catch (error) {
    console.error("Error saving history:", error);
  }
};

const getUserHistory = async (userId) => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, '67df4dc3003741c2098b', [
      Query.equal("userId", userId)
    ]);
    return response.documents;
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

const getUserId = async () => {
  try {
    const response = await account.get();
    return response.$id;
  } catch (error) {
    console.error("Error fetching user ID:", error);
    return null;
  }
};

const getUserConversations = async (userId) => {
  try {
    const response = await databases.listDocuments(
      '67d0bba1000e9caec4f2',
      '67edc4ef0032ae87bfe4',
      [
        Query.or([
          Query.equal('participant1', userId),
          Query.equal('participant2', userId)
        ]),
        Query.orderDesc('lastMessageAt')
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
  saveHistory, 
  getUserHistory, 
  getUserId,
  getUserConversations
};