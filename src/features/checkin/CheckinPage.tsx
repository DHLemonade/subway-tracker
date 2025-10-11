import { useState, useEffect } from 'react';
import type { Train, Platform, Checkin } from '../../types';
import { getAllTrains, addCheckin, addPhoto } from '../../db/indexedDbClient';
import { generateId, formatDate, compressImage, formatFileSize } from '../../utils/helpers';
import './CheckinPage.css';

export function CheckinPage() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string>('');
  const [platform, setPlatform] = useState<Platform>(1);
  const [notes, setNotes] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(Date.now()));

  useEffect(() => {
    loadTrains();
  }, []);

  async function loadTrains() {
    const trainList = await getAllTrains();
    setTrains(trainList);
    if (trainList.length > 0 && !selectedTrainId) {
      setSelectedTrainId(trainList[0].id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedTrainId) {
      alert('열차를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const checkinId = generateId();
      const now = Date.now();
      
      // 선택된 날짜를 timestamp로 변환 (시간은 현재 시간 유지)
      const selectedDateObj = new Date(selectedDate);
      const currentTime = new Date();
      selectedDateObj.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
      const checkinTimestamp = selectedDateObj.getTime();

      // 체크인 데이터 생성
      const checkin: Checkin = {
        id: checkinId,
        trainId: selectedTrainId,
        platform,
        timestamp: checkinTimestamp,
        notes,
        photoKey: photoFile ? generateId() : undefined,
        createdAt: now,
      };

      // 체크인 저장
      await addCheckin(checkin);

      // 사진이 있으면 압축 후 저장
      if (photoFile && checkin.photoKey) {
        const originalSize = photoFile.size;
        const compressedBlob = await compressImage(photoFile);
        const compressedSize = compressedBlob.size;
        
        console.log(`이미지 압축: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${Math.round((1 - compressedSize / originalSize) * 100)}% 절감)`);
        
        await addPhoto({
          id: checkin.photoKey,
          checkinId: checkin.id,
          blob: compressedBlob,
          createdAt: now,
        });
      }

      // 폼 초기화
      setNotes('');
      setPhotoFile(null);
      alert('체크인이 완료되었습니다!');
    } catch (error) {
      console.error('체크인 실패:', error);
      alert('체크인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  }

  return (
    <div className="checkin-page">
      <h1>체크인</h1>
      
      <form onSubmit={handleSubmit} className="checkin-form">
        <div className="form-group">
          <label>날짜</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
            max={formatDate(Date.now())}
          />
        </div>

        <div className="form-group">
          <label>열차 일련번호</label>
          <select
            value={selectedTrainId}
            onChange={(e) => setSelectedTrainId(e.target.value)}
            className="train-select"
          >
            {trains.length === 0 && <option value="">열차를 먼저 등록해주세요</option>}
            {trains.map((train) => (
              <option key={train.id} value={train.id}>
                {train.id}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>플랫폼</label>
          <div className="platform-toggle">
            <button
              type="button"
              className={platform === 1 ? 'active' : ''}
              onClick={() => setPlatform(1)}
            >
              1번
            </button>
            <button
              type="button"
              className={platform === 10 ? 'active' : ''}
              onClick={() => setPlatform(10)}
            >
              10번
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>특이사항</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="특이사항을 입력하세요"
            rows={4}
            className="notes-input"
          />
        </div>

        <div className="form-group">
          <label>사진 촬영</label>
          <label className="photo-capture-btn" htmlFor="photo-input">
            📷 사진 촬영
            {photoFile && <span className="photo-selected">✓</span>}
          </label>
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="photo-input-hidden"
          />
          {photoFile && (
            <div className="photo-preview">
              <img src={URL.createObjectURL(photoFile)} alt="미리보기" />
              <button
                type="button"
                className="photo-remove-btn"
                onClick={() => setPhotoFile(null)}
              >
                ✕ 삭제
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting || !selectedTrainId}
        >
          {isSubmitting ? '저장 중...' : '✓ 체크인'}
        </button>
      </form>
    </div>
  );
}
