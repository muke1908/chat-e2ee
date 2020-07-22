const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db = null;

const connectDb = async () => {
  try {
    await client.connect();
    db = client.db(dbName);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MONGO DB ERROR!');
  }
};

const insertInDb = async (data, collectionName) => {
  await db.collection(collectionName).insertOne(data);
  return data;
};

const findOneFromDB = (findCondition, collectionName) => {
  return db.collection(collectionName).findOne(findCondition);
};

module.exports = {
  db,
  connectDb,
  insertInDb,
  findOneFromDB
};
