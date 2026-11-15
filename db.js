const DB_NAME = "aire-library";
const DB_VERSION = 2;

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("books")) {
        const books = db.createObjectStore("books", { keyPath: "id" });
        books.createIndex("lastReadAt", "lastReadAt");
        books.createIndex("importedAt", "importedAt");
      }
      if (!db.objectStoreNames.contains("notes")) {
        const notes = db.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("bookId", "bookId");
        notes.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("folders")) {
        db.createObjectStore("folders", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(name, mode = "readonly") {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function putBook(book) {
  return requestToPromise((await store("books", "readwrite")).put(book));
}
export async function getBook(id) {
  return requestToPromise((await store("books")).get(id));
}
export async function deleteBook(id) {
  const db = await openDb();
  const tx = db.transaction(["books", "notes"], "readwrite");
  tx.objectStore("books").delete(id);
  const noteStore = tx.objectStore("notes");
  const index = noteStore.index("bookId");
  const range = IDBKeyRange.only(id);
  index.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
export async function listBooks() {
  return requestToPromise((await store("books")).getAll());
}
export async function putNote(note) {
  return requestToPromise((await store("notes", "readwrite")).put(note));
}
export async function deleteNote(id) {
  return requestToPromise((await store("notes", "readwrite")).delete(id));
}
export async function listNotes(bookId) {
  const s = await store("notes");
  return requestToPromise(s.index("bookId").getAll(bookId));
}
export async function putFolder(folder) {
  return requestToPromise((await store("folders", "readwrite")).put(folder));
}
export async function listFolders() {
  return requestToPromise((await store("folders")).getAll());
}
export async function exportLibraryData() {
  const [books, notes, folders] = await Promise.all([listBooks(), requestToPromise((await store("notes")).getAll()), listFolders()]);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    books: books.map(({ originalFile, content, ...meta }) => meta),
    notes,
    folders,
  };
}
