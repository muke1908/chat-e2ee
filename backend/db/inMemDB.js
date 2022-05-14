const findOneFromArr = (arr, findCondition) =>
  arr.find((data) => {
    const conditionKeys = Object.keys(findCondition);
    const results = conditionKeys.filter(
      (key) => findCondition[key] && data[key] === findCondition[key]
    );
    return results.length === conditionKeys.length;
  });

const storage = {};
let pk = 0;

module.exports = {
  insertInDb: (data, collectionName) => {
    if (!storage[collectionName]) {
      storage[collectionName] = [];
    }
    const collection = storage[collectionName];
    collection.push({
      pk,
      ...data
    });
    pk += 1;
  },
  findOneFromDB: (findCondition, collectionName) => {
    if (!storage[collectionName]) {
      return null;
    }
    const collection = storage[collectionName];
    return findOneFromArr(collection, findCondition);
  },
  updateOneFromDb: (condition, data, collectionName) => {
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
  }
};
