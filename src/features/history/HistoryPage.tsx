import { useState, useEffect } from 'react';
import type { Train, CheckinWithPhoto, Checkin } from '../../types';
import { getAllCheckins, getAllTrains, deleteCheckin, getPhotoByCheckinId, deletePhoto, addCheckin, addTrain } from '../../db/indexedDbClient';
import { formatDateTime, blobToDataURL } from '../../utils/helpers';
import { exportCheckinsToText, exportCheckinsToReadableText, parseImportText, copyToClipboard, shareViaKakao, downloadAsFile } from '../../utils/exportImport';
import { CalendarView } from '../../components/CalendarView';
import './HistoryPage.css';

type ViewMode = 'list' | 'calendar';

export function HistoryPage() {
  const [checkins, setCheckins] = useState<CheckinWithPhoto[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinWithPhoto | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [filterTrainId, setFilterTrainId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showDateDetailModal, setShowDateDetailModal] = useState(false);
  const [selectedDateCheckins, setSelectedDateCheckins] = useState<CheckinWithPhoto[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCheckin?.photoKey) {
      loadPhoto(selectedCheckin.photoKey);
    } else {
      setPhotoUrl(null);
    }
  }, [selectedCheckin]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [checkinList, trainList] = await Promise.all([
        getAllCheckins(),
        getAllTrains(),
      ]);

      // 열차 정보를 맵으로 변환
      const trainMap = new Map(trainList.map((t) => [t.id, t.id]));

      // 체크인에 열차 정보 추가
      const checkinsWithTrain: CheckinWithPhoto[] = checkinList.map((checkin) => ({
        ...checkin,
        trainNumber: trainMap.get(checkin.trainId),
      }));

      setCheckins(checkinsWithTrain);
      setTrains(trainList);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPhoto(_photoKey: string) {
    try {
      const photo = await getPhotoByCheckinId(selectedCheckin!.id);
      if (photo) {
        const dataUrl = await blobToDataURL(photo.blob);
        setPhotoUrl(dataUrl);
      }
    } catch (error) {
      console.error('사진 로드 실패:', error);
    }
  }

  async function handleDelete(checkin: CheckinWithPhoto) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      // 사진이 있으면 함께 삭제
      if (checkin.photoKey) {
        await deletePhoto(checkin.photoKey);
      }
      await deleteCheckin(checkin.id);
      
      // 목록 새로고침
      await loadData();
      setSelectedCheckin(null);
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  }

  function openModal(checkin: CheckinWithPhoto) {
    setSelectedCheckin(checkin);
  }

  function closeModal() {
    setSelectedCheckin(null);
    setPhotoUrl(null);
  }

  // 내보내기 기능
  async function handleExportJSON() {
    const text = exportCheckinsToText(trains, checkins);
    const success = await copyToClipboard(text);
    if (success) {
      alert('JSON 데이터가 클립보드에 복사되었습니다!');
    } else {
      alert('복사에 실패했습니다.');
    }
  }

  async function handleExportReadable() {
    const text = exportCheckinsToReadableText(trains, checkins);
    const success = await copyToClipboard(text);
    if (success) {
      alert('텍스트가 클립보드에 복사되었습니다!');
    } else {
      alert('복사에 실패했습니다.');
    }
  }

  async function handleShareKakao() {
    const text = exportCheckinsToReadableText(trains, checkins);
    const success = await shareViaKakao(text);
    if (success) {
      // 공유 성공
    } else {
      alert('공유에 실패했습니다. 텍스트가 클립보드에 복사되었습니다.');
    }
  }

  function handleDownloadFile() {
    const text = exportCheckinsToText(trains, checkins);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadAsFile(text, `subway-checkins-${timestamp}.json`);
    alert('파일이 다운로드되었습니다!');
  }

  // 가져오기 기능
  async function handleImport() {
    const trimmedText = importText.trim();
    if (!trimmedText) {
      alert('데이터를 입력해주세요.');
      return;
    }

    const data = parseImportText(trimmedText);
    if (!data) {
      alert('유효하지 않은 데이터 형식입니다.');
      return;
    }

    try {
      // 중복 체크를 위한 기존 ID 수집
      const existingTrainIds = new Set(trains.map(t => t.id));
      const existingCheckinIds = new Set(checkins.map(c => c.id));

      let addedTrains = 0;
      let addedCheckins = 0;

      // 열차 추가 (중복 제외)
      for (const train of data.trains) {
        if (!existingTrainIds.has(train.id)) {
          await addTrain(train);
          addedTrains++;
        }
      }

      // 체크인 추가 (중복 제외, photoKey 없이)
      for (const checkin of data.checkins) {
        if (!existingCheckinIds.has(checkin.id)) {
          await addCheckin({ ...checkin, photoKey: undefined } as Checkin);
          addedCheckins++;
        }
      }

      // 데이터 새로고침
      await loadData();
      setShowImportModal(false);
      setImportText('');
      alert(`가져오기 완료!\n열차: ${addedTrains}개, 체크인: ${addedCheckins}개 추가됨`);
    } catch (error) {
      console.error('Import error:', error);
      alert('데이터 가져오기에 실패했습니다.');
    }
  }

  const filteredCheckins = filterTrainId
    ? checkins.filter((c) => c.trainId === filterTrainId)
    : checkins;

  if (isLoading) {
    return <div className="history-page loading">로딩 중...</div>;
  }

  function handleDateClick(_dateKey: string, dateCheckins: CheckinWithPhoto[]) {
    setSelectedDateCheckins(dateCheckins);
    setShowDateDetailModal(true);
  }

  return (
    <div className="history-page">
      <h1>작업 히스토리</h1>

      {/* 뷰 전환 버튼 */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 목록
        </button>
        <button
          className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 캘린더
        </button>
      </div>

      {/* 필터 */}
      <div className="filter-section">
        <label>열차 필터:</label>
        <select
          value={filterTrainId}
          onChange={(e) => setFilterTrainId(e.target.value)}
          className="filter-select"
        >
          <option value="">전체</option>
          {trains.map((train) => (
            <option key={train.id} value={train.id}>
              {train.id}
            </option>
          ))}
        </select>
      </div>

      {/* 내보내기/가져오기 버튼 */}
      <div className="export-import-section">
        <button
          className="export-btn"
          onClick={() => setShowExportModal(true)}
          disabled={checkins.length === 0}
        >
          📤 내보내기
        </button>
        <button
          className="import-btn"
          onClick={() => setShowImportModal(true)}
        >
          📥 가져오기
        </button>
      </div>

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <CalendarView
          checkins={filteredCheckins}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onDateClick={handleDateClick}
        />
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <div className="checkin-list">
          {filteredCheckins.length === 0 ? (
            <p className="empty-message">작업 히스토리가 없습니다.</p>
          ) : (
            filteredCheckins.map((checkin) => (
              <div
                key={checkin.id}
                className="checkin-card"
                onClick={() => openModal(checkin)}
              >
                <div className="card-header">
                <h3>열차: {checkin.trainNumber || checkin.trainId}</h3>
                <span className="platform-badge">플랫폼 {checkin.platform}번</span>
              </div>
              <div className="card-body">
                <p className="timestamp">{formatDateTime(checkin.timestamp)}</p>
                {checkin.notes && (
                  <p className="notes-preview">{checkin.notes.substring(0, 50)}{checkin.notes.length > 50 ? '...' : ''}</p>
                )}
                {checkin.photoKey && <span className="photo-icon">📷</span>}
              </div>
            </div>
          ))
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedCheckin && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            
            <h2>체크인 상세</h2>
            
            <div className="modal-body">
              <div className="detail-row">
                <strong>열차:</strong>
                <span>{selectedCheckin.trainNumber || selectedCheckin.trainId}</span>
              </div>
              <div className="detail-row">
                <strong>플랫폼:</strong>
                <span>{selectedCheckin.platform}번</span>
              </div>
              <div className="detail-row">
                <strong>일시:</strong>
                <span>{formatDateTime(selectedCheckin.timestamp)}</span>
              </div>
              
              {selectedCheckin.notes && (
                <div className="detail-row notes">
                  <strong>특이사항:</strong>
                  <p>{selectedCheckin.notes}</p>
                </div>
              )}

              {photoUrl && (
                <div className="detail-photo">
                  <strong>사진:</strong>
                  <img src={photoUrl} alt="체크인 사진" />
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="delete-btn"
                onClick={() => handleDelete(selectedCheckin)}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 내보내기 모달 */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowExportModal(false)}>✕</button>
            
            <h2>데이터 내보내기</h2>
            <p className="modal-description">
              사진을 제외한 체크인 데이터를 내보냅니다.
            </p>

            <div className="export-options">
              <button className="option-btn" onClick={handleExportJSON}>
                <span className="option-icon">📋</span>
                <div className="option-text">
                  <strong>JSON 복사</strong>
                  <small>데이터 백업 및 다른 기기로 전송</small>
                </div>
              </button>

              <button className="option-btn" onClick={handleExportReadable}>
                <span className="option-icon">📝</span>
                <div className="option-text">
                  <strong>텍스트 복사</strong>
                  <small>사람이 읽기 쉬운 형태로 복사</small>
                </div>
              </button>

              <button className="option-btn" onClick={handleShareKakao}>
                <span className="option-icon">💬</span>
                <div className="option-text">
                  <strong>카카오톡 공유</strong>
                  <small>메신저로 데이터 전송</small>
                </div>
              </button>

              <button className="option-btn" onClick={handleDownloadFile}>
                <span className="option-icon">💾</span>
                <div className="option-text">
                  <strong>파일 다운로드</strong>
                  <small>JSON 파일로 저장</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가져오기 모달 */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            
            <h2>데이터 가져오기</h2>
            <p className="modal-description">
              JSON 형식의 체크인 데이터를 붙여넣으세요.
            </p>

            <textarea
              className="import-textarea"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"version":"1.0","exportDate":...}'
              rows={10}
            />

            <div className="import-actions">
              <button
                className="import-confirm-btn"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                가져오기
              </button>
              <button
                className="import-cancel-btn"
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
              >
                취소
              </button>
            </div>

            <div className="import-note">
              ℹ️ 중복된 데이터는 자동으로 제외됩니다.
            </div>
          </div>
        </div>
      )}

      {/* 날짜별 상세 모달 */}
      {showDateDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDateDetailModal(false)}>
          <div className="modal-content date-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDateDetailModal(false)}>✕</button>
            
            <h2>작업 내역 ({selectedDateCheckins.length}건)</h2>

            <div className="date-checkin-list">
              {selectedDateCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="date-checkin-item"
                  onClick={() => {
                    setShowDateDetailModal(false);
                    openModal(checkin);
                  }}
                >
                  <div className="date-checkin-header">
                    <h4>열차: {checkin.trainNumber || checkin.trainId}</h4>
                    <span className="platform-badge">플랫폼 {checkin.platform}번</span>
                  </div>
                  <p className="timestamp">{formatDateTime(checkin.timestamp)}</p>
                  {checkin.notes && (
                    <p className="notes-preview">{checkin.notes.substring(0, 50)}{checkin.notes.length > 50 ? '...' : ''}</p>
                  )}
                  {checkin.photoKey && <span className="photo-icon">📷</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
