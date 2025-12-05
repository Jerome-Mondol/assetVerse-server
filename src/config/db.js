import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from 'dotenv'
dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) throw new Error("MONGODB_URI not defined");

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db;

export const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("assetVerse");
    console.log("MongoDB Connected");
    return db;
  } catch (err) {
    console.error(err);
  }
};

// helper to get db in other files
export const getDB = () => {
  if (!db) throw new Error("Database not initialized");
  return db;
};
