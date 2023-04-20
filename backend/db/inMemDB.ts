export type MongoDataType = Record<any, any> | null;
const findOneFromArr = (arr: [], findCondition): MongoDataType =>
  arr.find((data) => {
    const conditionKeys = Object.keys(findCondition);
    const results = conditionKeys.filter(
      (key) => findCondition[key] && data[key] === findCondition[key]
    );
    return results.length === conditionKeys.length;
  });

const storage = {};
let pk = 0;

export const insertInDb = (data, collectionName: string): void => {
  if (!storage[collectionName]) {
    storage[collectionName] = [];
  }
  const collection = storage[collectionName];
  collection.push({
    pk,
    ...data
  });
  pk += 1;
};
export const findOneFromDB = (findCondition, collectionName: string) => {
  if (!storage[collectionName]) {
    return null;
  }
  const collection = storage[collectionName];
  return findOneFromArr(collection, findCondition);
};
export const updateOneFromDb = (condition, data, collectionName: string): MongoDataType  => {
  if (!storage[collectionName]) {
    return null;
  }
  const collection = storage[collectionName];
  const originalData = findOneFromArr(collection, condition);

  if (!originalData) {
    return null;
  }

  Object.keys(data).forEach((key) => {
    const val = data[key];
    originalData[key] = val;
  });

  return originalData;
};
