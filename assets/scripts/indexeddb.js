const DB_NAME = 'myclara_db';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'studentFiles';

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error: ", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

async function saveStudentFile(fileData) {
    await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.add(fileData);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error("Error saving file: ", event.target.error);
            reject(event.target.error);
        };
    });
}

async function getAllFilesByEmail(email) {
    await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.openCursor();
        const files = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.email === email) {
                    files.push(cursor.value);
                }
                cursor.continue();
            } else {
                resolve(files);
            }
        };

        request.onerror = (event) => {
            console.error("Error getting files: ", event.target.error);
            reject(event.target.error);
        };
    });
}

async function deleteFile(id) {
    await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error("Error deleting file: ", event.target.error);
            reject(event.target.error);
        };
    });
}
