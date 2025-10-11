// UUID 생성 유틸리티
export function generateId(): string {
  return crypto.randomUUID();
}

// 날짜 포맷팅 (YYYY-MM-DD) - HTML5 date input 호환
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 날짜+시간 포맷팅 (YYYY-MM-DD HH:MM)
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 오늘 날짜의 시작 시간 (00:00:00)
export function getTodayStart(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

// 오늘 날짜의 끝 시간 (23:59:59)
export function getTodayEnd(): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
}

// 이미지 파일을 Blob으로 변환
export function fileToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Blob([reader.result], { type: file.type }));
      } else {
        reject(new Error('Failed to convert file to blob'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Blob을 Data URL로 변환 (이미지 미리보기용)
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // Blob이 유효한지 확인
    if (!blob || blob.size === 0) {
      reject(new Error('Invalid or empty blob'));
      return;
    }

    // MIME 타입이 없으면 기본값 설정 (사파리 호환성)
    const blobWithType = blob.type ? blob : new Blob([blob], { type: 'image/jpeg' });

    const reader = new FileReader();
    
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('FileReader error'));
    };
    
    reader.readAsDataURL(blobWithType);
  });
}

// 이미지 압축 함수
export function compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // 캔버스 생성
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 비율 유지하면서 리사이즈
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 이미지 그리기
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// 파일 크기를 사람이 읽기 쉬운 형태로 변환
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
