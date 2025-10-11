import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Train, Checkin, Photo } from '../types';

// IndexedDB 스키마 정의
interface SubwayTrackerDB extends DBSchema {
  trains: {
    key: string;
    value: Train;
    indexes: { 'by-createdAt': number };
  };
  checkins: {
    key: string;
    value: Checkin;
    indexes: { 'by-timestamp': number; 'by-trainId': string };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: { 'by-checkinId': string };
  };
}

const DB_NAME = 'subway-tracker-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SubwayTrackerDB> | null = null;

// IndexedDB 초기화
export async function initDB(): Promise<IDBPDatabase<SubwayTrackerDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SubwayTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // trains 스토어
      if (!db.objectStoreNames.contains('trains')) {
        const trainStore = db.createObjectStore('trains', { keyPath: 'id' });
        trainStore.createIndex('by-createdAt', 'createdAt');
      }

      // checkins 스토어
      if (!db.objectStoreNames.contains('checkins')) {
        const checkinStore = db.createObjectStore('checkins', { keyPath: 'id' });
        checkinStore.createIndex('by-timestamp', 'timestamp');
        checkinStore.createIndex('by-trainId', 'trainId');
      }

      // photos 스토어
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by-checkinId', 'checkinId');
      }
    },
  });

  return dbInstance;
}

// ===== Train CRUD =====
export async function addTrain(train: Train): Promise<void> {
  const db = await initDB();
  await db.add('trains', train);
}

export async function getAllTrains(): Promise<Train[]> {
  const db = await initDB();
  return db.getAll('trains');
}

export async function deleteTrain(trainId: string): Promise<void> {
  const db = await initDB();
  await db.delete('trains', trainId);
}

// ===== Checkin CRUD =====
export async function addCheckin(checkin: Checkin): Promise<void> {
  const db = await initDB();
  await db.add('checkins', checkin);
}

export async function getAllCheckins(): Promise<Checkin[]> {
  const db = await initDB();
  const checkins = await db.getAllFromIndex('checkins', 'by-timestamp');
  return checkins.reverse(); // 최신순
}

export async function getCheckinsByTrainId(trainId: string): Promise<Checkin[]> {
  const db = await initDB();
  return db.getAllFromIndex('checkins', 'by-trainId', trainId);
}

export async function updateCheckin(checkin: Checkin): Promise<void> {
  const db = await initDB();
  await db.put('checkins', checkin);
}

export async function deleteCheckin(checkinId: string): Promise<void> {
  const db = await initDB();
  await db.delete('checkins', checkinId);
}

// ===== Photo CRUD =====
export async function addPhoto(photo: Photo): Promise<void> {
  const db = await initDB();
  await db.add('photos', photo);
}

export async function getPhotoById(photoId: string): Promise<Photo | undefined> {
  const db = await initDB();
  return db.get('photos', photoId);
}

export async function getPhotoByCheckinId(checkinId: string): Promise<Photo | undefined> {
  const db = await initDB();
  const photos = await db.getAllFromIndex('photos', 'by-checkinId', checkinId);
  return photos[0];
}

export async function deletePhoto(photoId: string): Promise<void> {
  const db = await initDB();
  await db.delete('photos', photoId);
}
