// inspired by https://www.algolia.com/doc/tutorials/indexing/exporting/how-to-export-data-of-an-index-to-a-file/

const algoliasearch = require('algoliasearch');

const getIndex = ({ indexName, appId, apiKey }) =>
  algoliasearch(appId, apiKey).initIndex(indexName);

const forEachRecord = ({ indexName, appId, apiKey }, recordHandler) =>
  new Promise((resolve, reject) => {
    const browser = getIndex({ indexName, appId, apiKey }).browseAll();
    browser.on('result', content =>
      content.hits.forEach(hit => recordHandler(hit))
    );
    browser.on('end', () => {
      resolve();
    });
    browser.on('error', err => {
      reject(err);
    });
  });

const makeSetFromIndex = ({ indexName, appId, apiKey }) => new Promise((resolve) => {
  const set = new Set();
  forEachRecord({ indexName, appId, apiKey }, hit => set.add(hit.objectID))
    .then(
      () => resolve(set),
      (err) => /does not exist/.test(err.message) ? resolve(set) : reject(err)
    );
});

class BatchedAlgoliaIndexer {
  constructor({ index, batchSize = 1000 }){
    this.index = index;
    this.batchSize = batchSize;
    this.buffer = [];
  }
  // will send objects to Algolia until buffer is empty, then resolve
  flush() {
    const batch = this.buffer.splice(0, this.batchSize);
    console.log(`  (indexing ${batch.length} objects on algolia.com)`);
    return this.index.addObjects(batch)
      .then(() => this.buffer.length > 0 ? this.flush() : Promise.resolve());
  }
  // will accumulate objects in buffer and send when its size >= batchSize
  addObject(obj) {
    this.buffer.push(obj);
    return (this.buffer.length >= this.batchSize) ? this.flush() : Promise.resolve();
  }
}

module.exports = {
  getIndex,
  forEachRecord,
  makeSetFromIndex,
  BatchedAlgoliaIndexer,
};
