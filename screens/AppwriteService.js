import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('67d0bb27002cfc0b22d2');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const ID = ID;
export const Query = Query;

export const DATABASE_ID = 'your_database_id'; // Replace with your actual database ID
export const COLLECTIONS = {
  USER_PROFILES: 'your_user_profiles_collection_id', // Replace with your actual collection ID
};