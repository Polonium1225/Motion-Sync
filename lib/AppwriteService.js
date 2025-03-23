import { Client, Account, Databases, Query, ID} from 'appwrite'; 

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('67d0bb27002cfc0b22d2');

const account = new Account(client);
const databases = new Databases(client);

const DATABASE_ID = '67d0bba1000e9caec4f2';  


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
    console.error("Error saving history gg:", error);
  }
};

const getUserHistory = async (userId) => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, '67df4dc3003741c2098b', [
      Query.equal("userId", userId)
    ]);
    // console.log("History fetched:", response.documents);
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

export { account, databases, Query, ID , saveHistory, getUserHistory, getUserId }; 

