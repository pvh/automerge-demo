const DB_NAME = "automerge-demo";

export class DB {
  db: Promise<IDBDatabase>;

  constructor() {
    this.db = this.init();
  }

  async init() {
    const request = indexedDB.open(DB_NAME, 3);

    request.onerror = function (event) {
      console.warn("IndexedDB Error", event);
    };

    const success = new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = function (event) {
        const db = request.result;
        resolve(db);
      };
    });

    request.onupgradeneeded = function (event) {
      const db = request.result;

      const objectStore = db.createObjectStore("docs", { keyPath: "hash" });

      objectStore.createIndex("docId", "docId", { unique: false });

      // objectStore.transaction.oncomplete = function () {

      // };
    };

    return success;
  }

  async storeChange(docId: string, hash: string, change: any) {
    const db = await this.db;
    const transaction = db.transaction(["docs"], "readwrite");
    const store = transaction.objectStore("docs");
    store.add({
      docId,
      hash,
      change,
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = function (event) {
        resolve(true);
      };

      transaction.onerror = function (event) {
        reject();
      };
    });
  }

  async getChanges(docId: string) {
    const db = await this.db;
    const transaction = db.transaction(["docs"]);
    const store = transaction.objectStore("docs");
    const index = store.index("docId");
    const singleKeyRange = IDBKeyRange.only(docId);
    const request = index.openCursor(singleKeyRange);

    const changes: any[] = [];

    request.onsuccess = function (event) {
      const cursor = request.result;
      if (cursor) {
        changes.push(cursor.value.change);
        cursor.continue();
      }
    };

    return new Promise((resolve) => {
      transaction.oncomplete = function (event) {
        resolve(changes);
      };
    });
  }
}
