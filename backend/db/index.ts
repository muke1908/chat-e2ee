import { MongoClient } from "mongodb";
import {
  insertInDb as _insertInDb,
  findOneFromDB as _findOneFromDB,
  updateOneFromDb as _updateOneFromDb
} from "./inMemDB";

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const client = uri ? new MongoClient(uri) : null;

let db = null;
let inMem = uri ? false : true;

const connectDb = async () => {
  try {
    if (!client) throw new Error("No client");
    await client.connect();
    db = client.db(dbName);
  } catch (err) {
    inMem = true;
    // eslint-disable-next-line no-console
    console.error("MONGO DB ERROR!", "Using in-memory DB - Not reliable!!");
  }
};

const insertInDb = async<T>(data: T, collectionName): Promise<T> => {
  await db.collection(collectionName).insertOne(data);
  return data;
};

const findOneFromDB = (findCondition, collectionName) =>
  db.collection(collectionName).findOne(findCondition);

const updateOneFromDb = (condition, data, collectionName) =>
  db.collection(collectionName).updateOne(condition, { $set: data });

const opsAdapter = () => {
  if (inMem) {
    console.log("in memory database");
    return {
      insertInDb: _insertInDb,
      findOneFromDB: _findOneFromDB,
      updateOneFromDb: _updateOneFromDb
    };
  } else {
    console.log("mongodb database");
    return {
      insertInDb,
      findOneFromDB,
      updateOneFromDb
    };
  }
};

export default {
  db,
  connectDb,
  ...opsAdapter()
};
