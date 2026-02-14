/**
 * Lazy-loaded Firebase modules
 * Only import these when actually needed to reduce initial bundle size
 */

// Lazy load Firestore
export const getFirestore = async () => {
  const { getFirestore: getFirestoreSDK } = await import('firebase/firestore');
  const { default: app } = await import('./firebase');
  return getFirestoreSDK(app);
};

// Lazy load Firestore functions
export const getFirestoreFunctions = async () => {
  const firestore = await import('firebase/firestore');
  return {
    collection: firestore.collection,
    doc: firestore.doc,
    getDoc: firestore.getDoc,
    getDocs: firestore.getDocs,
    setDoc: firestore.setDoc,
    updateDoc: firestore.updateDoc,
    deleteDoc: firestore.deleteDoc,
    addDoc: firestore.addDoc,
    query: firestore.query,
    where: firestore.where,
    orderBy: firestore.orderBy,
    limit: firestore.limit,
    startAfter: firestore.startAfter,
    Timestamp: firestore.Timestamp,
    serverTimestamp: firestore.serverTimestamp,
    onSnapshot: firestore.onSnapshot,
  };
};

// Lazy load Storage
export const getStorage = async () => {
  const { getStorage: getStorageSDK } = await import('firebase/storage');
  const { default: app } = await import('./firebase');
  return getStorageSDK(app);
};

// Lazy load Storage functions
export const getStorageFunctions = async () => {
  const storage = await import('firebase/storage');
  return {
    ref: storage.ref,
    uploadBytes: storage.uploadBytes,
    uploadBytesResumable: storage.uploadBytesResumable,
    getDownloadURL: storage.getDownloadURL,
    deleteObject: storage.deleteObject,
  };
};
