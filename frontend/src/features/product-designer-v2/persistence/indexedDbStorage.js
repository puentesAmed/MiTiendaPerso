export const DESIGNER_DB_NAME = "mitiendaperso-designer-v2";
export const DESIGNER_DB_VERSION = 1;
export const DRAFT_STORE = "drafts";
export const ASSET_STORE = "assets";

export class StorageUnavailableError extends Error {
  constructor(message = "IndexedDB no está disponible.", cause) {
    super(message, { cause });
    this.name = "StorageUnavailableError";
  }
}

export class StorageConflictError extends Error {
  constructor() {
    super("El draft fue modificado en otra pestaña.");
    this.name = "StorageConflictError";
  }
}

export function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("Transacción IndexedDB cancelada."));
    transaction.onerror = () => reject(transaction.error || new Error("Error de transacción IndexedDB."));
  });
}

export function createIndexedDbStorage({ indexedDBImpl = globalThis.indexedDB, dbName = DESIGNER_DB_NAME } = {}) {
  let databasePromise = null;

  function open() {
    if (!indexedDBImpl) return Promise.reject(new StorageUnavailableError());
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        let request;
        try {
          request = indexedDBImpl.open(dbName, DESIGNER_DB_VERSION);
        } catch (error) {
          reject(new StorageUnavailableError("No se pudo abrir IndexedDB.", error));
          return;
        }
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(DRAFT_STORE)) database.createObjectStore(DRAFT_STORE, { keyPath: "draftId" });
          if (!database.objectStoreNames.contains(ASSET_STORE)) database.createObjectStore(ASSET_STORE, { keyPath: "assetId" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new StorageUnavailableError("No se pudo abrir IndexedDB.", request.error));
        request.onblocked = () => reject(new StorageUnavailableError("La actualización de IndexedDB está bloqueada por otra pestaña."));
      });
    }
    return databasePromise;
  }

  async function run(storeName, mode, operation) {
    const database = await open();
    const transaction = database.transaction(storeName, mode);
    const result = await operation(transaction.objectStore(storeName));
    await transactionDone(transaction);
    return result;
  }

  return {
    get: (storeName, key) => run(storeName, "readonly", (store) => requestResult(store.get(key))),
    getAll: (storeName) => run(storeName, "readonly", (store) => requestResult(store.getAll())),
    put: (storeName, value) => run(storeName, "readwrite", (store) => requestResult(store.put(value))),
    delete: (storeName, key) => run(storeName, "readwrite", (store) => requestResult(store.delete(key))),
    async compareAndPutDraft(value, { expectedRevision = null, force = false } = {}) {
      const database = await open();
      const transaction = database.transaction(DRAFT_STORE, "readwrite");
      const store = transaction.objectStore(DRAFT_STORE);
      const current = await requestResult(store.get(value.draftId));
      if (!force && ((current && current.revision !== expectedRevision) || (!current && expectedRevision !== null))) {
        transaction.abort();
        throw new StorageConflictError();
      }
      const saved = { ...value, revision: (current?.revision || 0) + 1 };
      await requestResult(store.put(saved));
      await transactionDone(transaction);
      return saved;
    },
  };
}

