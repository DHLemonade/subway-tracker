// 데이터 모델 타입 정의

export interface Train {
  id: string; // 열차 일련번호
  createdAt: number; // 등록 시간
}

export interface Task {
  id: string; // UUID
  date: string; // 일감 받은 날짜 (YYYY-MM-DD)
  name?: string; // 작업명 (선택)
  createdAt: number; // 생성 시간
}

export type Platform = 1 | 10;

export interface Checkin {
  id: string; // UUID
  trainId: string; // 열차 일련번호
  platform: Platform; // 플랫폼 번호 (1 또는 10)
  timestamp: number; // 체크인 시간
  notes: string; // 특이사항
  photoKey?: string; // 사진 ID (photos 테이블의 키) - 하위 호환성 유지
  photoKeys?: string[]; // 여러 사진 ID 배열
  taskId?: string; // 수주일 ID
  createdAt: number; // 생성 시간
}

export interface Photo {
  id: string; // UUID
  checkinId: string; // 체크인 ID
  blob: Blob; // 사진 데이터
  createdAt: number; // 업로드 시간
}

// UI용 확장 타입
export interface CheckinWithPhoto extends Checkin {
  photo?: Photo;
  trainNumber?: string;
}
