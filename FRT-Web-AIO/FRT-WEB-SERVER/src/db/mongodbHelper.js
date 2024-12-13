import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToMongoDB() {
  try {
    await client.connect();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    throw err;
  }
}

async function disconnectFromMongoDB() {
  try {
    await client.close();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error disconnecting from MongoDB:', err);
    throw err;
  }
}

async function findDocuments(databaseName, collectionName, query = {}, options = {}) {
  try {
    await client.connect();
    const database = client.db(databaseName);
    const collection = database.collection(collectionName);

    const cursor = collection.find(query, options);
    return cursor.toArray();
  } catch (err) {
    console.error(`Error finding documents in ${collectionName}:`, err);
    throw err;
  }
}

async function insertDocument(databaseName, collectionName, document) {
  try {
    await client.connect();
    const database = client.db(databaseName);
    const collection = database.collection(collectionName);

    const result = await collection.insertOne(document);
    return result.insertedId;
  } catch (err) {
    console.error(`Error inserting document into ${collectionName}:`, err);
    throw err;
  }
}

// You can add more functions for other operations like updating, deleting, etc.

export { connectToMongoDB, disconnectFromMongoDB, findDocuments, insertDocument };

