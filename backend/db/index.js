const { MongoClient } = require('mongodb');
const inMemDB = require('./inMemDB');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db = null;
let inMem = false;

const connectDb = async () => {
  try {
    await client.connect();
    db = client.db(dbName);
  } catch (err) {
    inMem = true;
    // eslint-disable-next-line no-console
    console.error('MONGO DB ERROR!', 'Using in-memory DB - Not reliable!!');
  }
};

const insertInDb = async (data, collectionName) => {
  await db.collection(collectionName).insertOne(data);
  return data;
};

const findOneFromDB = (findCondition, collectionName) =>
  db.collection(collectionName).findOne(findCondition);

const updateOneFromDb = (condition, data, collectionName) =>
  db.collection(collectionName).updateOne(condition, { $set: data });

const opsAdapter = () => {
  return {
    insertInDb: (...args) => (inMem ? inMemDB.insertInDb(...args) : insertInDb(...args)),
    findOneFromDB: (...args) => (inMem ? inMemDB.findOneFromDB(...args) : findOneFromDB(...args)),
    updateOneFromDb: (...args) =>
      inMem ? inMemDB.updateOneFromDb(...args) : updateOneFromDb(...args)
  };
};

module.exports = {
  db,
  connectDb,
  ...opsAdapter()
};
