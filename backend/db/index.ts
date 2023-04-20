import { Db, MongoClient } from "mongodb";
import {
  insertInDb as _insertInDb,
  findOneFromDB as _findOneFromDB,
  updateOneFromDb as _updateOneFromDb
} from "./inMemDB";

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const client = uri ? new MongoClient(uri) : null;

let db: Db = null;
let inMem = uri ? false : true;

const connectDb = async (): Promise<void> => {
  try {
    if (!client) throw new Error("No client");
    await client.connect();
    db = client.db(dbName);
  } catch (err) {
    console.error({ err })
    inMem = true;
    // eslint-disable-next-line no-console
    console.error("MONGO DB ERROR!", "Using in-memory DB - Not reliable!!");
  }
};

const insertInDb = async<T>(data: T, collectionName: string): Promise<T> => {
  if(inMem) {
    _insertInDb(data, collectionName);
  }else {
    await db.collection(collectionName).insertOne(data);
  }

  return data;
};

const findOneFromDB = async<T>(findCondition, collectionName: string): Promise<T> => {
  if(inMem) {
    return _findOneFromDB(findCondition, collectionName);
  }

  return db.collection(collectionName).findOne(findCondition) as T;
}

const updateOneFromDb = async<T>(condition, data, collectionName: string): Promise<T> => {
  if(inMem) {
    return _updateOneFromDb(condition, data, collectionName) as Promise<T>;
  }
  return db.collection(collectionName).updateOne(condition, { $set: data })  as Promise<T>;
}

export default {
  db,
  connectDb,
  insertInDb,
  findOneFromDB,
  updateOneFromDb,
};
