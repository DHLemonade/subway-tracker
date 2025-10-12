import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Train, Checkin, Photo, Task } from '../types';

// IndexedDB 스키마 정의
interface SubwayTrackerDB extends DBSchema {
  trains: {
    key: string;
    value: Train;
    indexes: { 'by-createdAt': number };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-date': string; 'by-createdAt': number };
  };
  checkins: {
    key: string;
    value: Checkin;
    indexes: { 'by-timestamp': number; 'by-trainId': string; 'by-taskId': string };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: { 'by-checkinId': string };
  };
}

const DB_NAME = 'subway-tracker-db';
const DB_VERSION = 2; // 스키마 변경으로 버전 업

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

      // tasks 스토어 (v2에서 추가)
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-date', 'date');
        taskStore.createIndex('by-createdAt', 'createdAt');
      }

      // checkins 스토어
      if (!db.objectStoreNames.contains('checkins')) {
        const checkinStore = db.createObjectStore('checkins', { keyPath: 'id' });
        checkinStore.createIndex('by-timestamp', 'timestamp');
        checkinStore.createIndex('by-trainId', 'trainId');
        checkinStore.createIndex('by-taskId', 'taskId');
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

// ===== Task CRUD =====
export async function addTask(task: Task): Promise<void> {
  const db = await initDB();
  await db.add('tasks', task);
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await initDB();
  const tasks = await db.getAll('tasks');
  // 날짜 역순으로 정렬 (최신순)
  return tasks.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTaskById(taskId: string): Promise<Task | undefined> {
  const db = await initDB();
  return db.get('tasks', taskId);
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = await initDB();
  await db.delete('tasks', taskId);
}

export async function getLatestTask(): Promise<Task | undefined> {
  const tasks = await getAllTasks();
  return tasks[0]; // 이미 날짜 역순으로 정렬되어 있음
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

export async function getAllPhotos(): Promise<Photo[]> {
  const db = await initDB();
  return db.getAll('photos');
}

// ===== Storage Management =====
export async function calculateStorageSize(): Promise<{ total: number; photos: number; data: number }> {
  const db = await initDB();
  
  // 사진 크기 계산
  const photos = await db.getAll('photos');
  let photosSize = 0;
  for (const photo of photos) {
    photosSize += photo.blob.size;
  }
  
  // 체크인 데이터 크기 추정 (JSON 문자열 길이로 근사)
  const checkins = await db.getAll('checkins');
  const trains = await db.getAll('trains');
  const dataSize = JSON.stringify([...checkins, ...trains]).length;
  
  return {
    total: photosSize + dataSize,
    photos: photosSize,
    data: dataSize,
  };
}

// 오래된 사진 삭제
export async function deleteOldPhotos(daysOld: number): Promise<number> {
  const db = await initDB();
  const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  const photos = await db.getAll('photos');
  let deletedCount = 0;
  
  for (const photo of photos) {
    if (photo.createdAt < cutoffDate) {
      await db.delete('photos', photo.id);
      deletedCount++;
    }
  }
  
  return deletedCount;
}
