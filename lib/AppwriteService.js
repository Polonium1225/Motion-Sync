import { Client, Account, Databases, Query } from 'appwrite'; 

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('motion-sync');

const account = new Account(client);
const databases = new Databases(client);

export { account, databases, Query }; // Export Query