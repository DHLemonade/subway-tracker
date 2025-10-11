import type { Checkin, Train } from '../types';

// 데이터 내보내기 포맷
export interface ExportData {
  version: string;
  exportDate: number;
  trains: Train[];
  checkins: Omit<Checkin, 'photoKey'>[]; // 사진 제외
}

// 체크인 데이터를 텍스트로 변환 (JSON)
export function exportCheckinsToText(trains: Train[], checkins: Checkin[]): string {
  // photoKey 제외하고 내보내기
  const checkinsWithoutPhotos = checkins.map(({ photoKey, ...rest }) => rest);
  
  const exportData: ExportData = {
    version: '1.0',
    exportDate: Date.now(),
    trains,
    checkins: checkinsWithoutPhotos,
  };

  return JSON.stringify(exportData, null, 2);
}

// 텍스트를 파싱하여 데이터 추출
export function parseImportText(text: string): ExportData | null {
  try {
    const data = JSON.parse(text) as ExportData;
    
    // 기본 검증
    if (!data.version || !Array.isArray(data.trains) || !Array.isArray(data.checkins)) {
      throw new Error('Invalid data format');
    }

    return data;
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

// 클립보드에 복사
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}

// 카카오톡 공유 (Web Share API 사용)
export async function shareViaKakao(text: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({
        title: '지하철 체크인 데이터',
        text: text,
      });
      return true;
    } else {
      // Web Share API 미지원 시 클립보드 복사로 대체
      return await copyToClipboard(text);
    }
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
}

// 파일로 다운로드
export function downloadAsFile(text: string, filename: string = 'subway-checkins.json'): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 사람이 읽기 쉬운 포맷으로 변환 (카카오톡 공유용)
export function exportCheckinsToReadableText(trains: Train[], checkins: Checkin[]): string {
  const trainMap = new Map(trains.map(t => [t.id, t.id]));
  
  let text = `📊 지하철 체크인 기록\n`;
  text += `날짜: ${new Date().toLocaleDateString('ko-KR')}\n`;
  text += `총 ${checkins.length}건\n`;
  text += `\n${'='.repeat(30)}\n\n`;

  checkins.forEach((checkin, index) => {
    const trainNumber = trainMap.get(checkin.trainId) || checkin.trainId;
    const date = new Date(checkin.timestamp).toLocaleString('ko-KR');
    
    text += `[${index + 1}] ${date}\n`;
    text += `🚇 열차: ${trainNumber}\n`;
    text += `📍 플랫폼: ${checkin.platform}번\n`;
    if (checkin.notes) {
      text += `📝 메모: ${checkin.notes}\n`;
    }
    text += `\n`;
  });

  return text;
}
