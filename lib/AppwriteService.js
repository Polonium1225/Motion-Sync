import { Client, Account, Databases, Query, ID} from 'appwrite'; 

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') 
  .setProject('67d0bb27002cfc0b22d2');

const account = new Account(client);
const databases = new Databases(client);

export { account, databases, Query, ID }; // Export Query