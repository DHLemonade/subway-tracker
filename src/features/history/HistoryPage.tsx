import { useState, useEffect } from 'react';
import type { Train, CheckinWithPhoto, Checkin, Platform, Task } from '../../types';
import { getAllCheckins, getAllTrains, deleteCheckin, getPhotoByCheckinId, deletePhoto, addCheckin, addTrain, updateCheckin, getAllTasks, addTask } from '../../db/indexedDbClient';
import { formatDateTime, formatDate, blobToDataURL } from '../../utils/helpers';
import { exportCheckinsToText, exportCheckinsToReadableText, parseImportText, copyToClipboard, shareViaKakao, downloadAsFile } from '../../utils/exportImport';
import { CalendarView } from '../../components/CalendarView';
import './HistoryPage.css';

type ViewMode = 'list' | 'calendar';

type SortType = 'latest' | 'train' | 'task';
type SortOrder = 'asc' | 'desc';

export function HistoryPage() {
  const [checkins, setCheckins] = useState<CheckinWithPhoto[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinWithPhoto | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [filterTrainId, setFilterTrainId] = useState<string>('');
  const [filterTaskId, setFilterTaskId] = useState<string>('');
  const [sortType, setSortType] = useState<SortType>('latest');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showKakaoShareModal, setShowKakaoShareModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showDateDetailModal, setShowDateDetailModal] = useState(false);
  const [selectedDateCheckins, setSelectedDateCheckins] = useState<CheckinWithPhoto[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    trainId: string;
    platform: Platform;
    date: string;
    notes: string;
  }>({
    trainId: '',
    platform: 1,
    date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCheckin) {
      loadPhotos(selectedCheckin);
    } else {
      setPhotoUrls([]);
    }
  }, [selectedCheckin]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [checkinList, trainList, taskList] = await Promise.all([
        getAllCheckins(),
        getAllTrains(),
        getAllTasks(),
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
      setTasks(taskList);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPhotos(checkin: CheckinWithPhoto) {
    try {
      const urls: string[] = [];
      
      // 새 형식: photoKeys 배열
      if (checkin.photoKeys && checkin.photoKeys.length > 0) {
        for (const photoKey of checkin.photoKeys) {
          try {
            const photo = await getPhotoByCheckinId(checkin.id);
            if (photo && photo.blob) {
              const dataUrl = await blobToDataURL(photo.blob);
              urls.push(dataUrl);
            }
          } catch (error) {
            console.error(`사진 로드 실패 (${photoKey}):`, error);
          }
        }
      }
      // 구 형식: photoKey 단일 (하위 호환성)
      else if (checkin.photoKey) {
        const photo = await getPhotoByCheckinId(checkin.id);
        if (photo && photo.blob) {
          const dataUrl = await blobToDataURL(photo.blob);
          urls.push(dataUrl);
        }
      }
      
      setPhotoUrls(urls);
    } catch (error) {
      console.error('사진 로드 실패:', error);
      setPhotoUrls([]);
    }
  }

  async function handleDelete(checkin: CheckinWithPhoto) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      // 사진들이 있으면 함께 삭제
      if (checkin.photoKeys && checkin.photoKeys.length > 0) {
        for (const photoKey of checkin.photoKeys) {
          await deletePhoto(photoKey);
        }
      }
      // 구 형식 호환성
      else if (checkin.photoKey) {
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
    setPhotoUrls([]);
  }

  function openEditModal(checkin: CheckinWithPhoto) {
    setEditFormData({
      trainId: checkin.trainId,
      platform: checkin.platform,
      date: formatDate(checkin.timestamp),
      notes: checkin.notes || '',
    });
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditFormData({
      trainId: '',
      platform: 1,
      date: '',
      notes: '',
    });
  }

  async function handleUpdateCheckin() {
    if (!selectedCheckin) return;

    if (!editFormData.trainId) {
      alert('열차를 선택해주세요.');
      return;
    }

    try {
      // 날짜 변환 (시간 정보는 원래 체크인의 시간 유지)
      const originalDate = new Date(selectedCheckin.timestamp);
      const newDate = new Date(editFormData.date);
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());

      const updatedCheckin: Checkin = {
        id: selectedCheckin.id,
        trainId: editFormData.trainId,
        platform: editFormData.platform,
        timestamp: newDate.getTime(),
        notes: editFormData.notes,
        photoKey: selectedCheckin.photoKey,
        photoKeys: selectedCheckin.photoKeys,
        taskId: selectedCheckin.taskId,
        createdAt: selectedCheckin.createdAt,
      };

      await updateCheckin(updatedCheckin);
      await loadData();
      closeEditModal();
      closeModal();
      alert('체크인이 수정되었습니다.');
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정에 실패했습니다.');
    }
  }

  // 내보내기 기능
  async function handleExportJSON() {
    const text = exportCheckinsToText(trains, tasks, checkins);
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

  function handleShareKakao() {
    setShowExportModal(false);
    setShowKakaoShareModal(true);
  }

  async function handleShareKakaoReadable() {
    const text = exportCheckinsToReadableText(trains, checkins);
    const success = await shareViaKakao(text);
    if (success) {
      setShowKakaoShareModal(false);
    } else {
      alert('공유에 실패했습니다. 텍스트가 클립보드에 복사되었습니다.');
    }
  }

  async function handleShareKakaoJSON() {
    const text = exportCheckinsToText(trains, tasks, checkins);
    const success = await shareViaKakao(text);
    if (success) {
      setShowKakaoShareModal(false);
    } else {
      alert('공유에 실패했습니다. 텍스트가 클립보드에 복사되었습니다.');
    }
  }

  function handleDownloadFile() {
    const text = exportCheckinsToText(trains, tasks, checkins);
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
      const existingTaskIds = new Set(tasks.map(t => t.id));
      const existingCheckinIds = new Set(checkins.map(c => c.id));

      let addedTrains = 0;
      let addedTasks = 0;
      let addedCheckins = 0;

      // 열차 추가 (중복 제외)
      for (const train of data.trains) {
        if (!existingTrainIds.has(train.id)) {
          await addTrain(train);
          addedTrains++;
        }
      }

      // 수주일 추가 (중복 제외)
      for (const task of data.tasks) {
        if (!existingTaskIds.has(task.id)) {
          await addTask(task);
          addedTasks++;
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
      alert(`가져오기 완료!\n열차: ${addedTrains}개, 수주일: ${addedTasks}개, 체크인: ${addedCheckins}개 추가됨`);
    } catch (error) {
      console.error('Import error:', error);
      alert('데이터 가져오기에 실패했습니다.');
    }
  }

  // 필터링 및 정렬
  const filteredAndSortedCheckins = checkins
    .filter((c) => !filterTrainId || c.trainId === filterTrainId)
    .filter((c) => !filterTaskId || c.taskId === filterTaskId)
    .sort((a, b) => {
      let result = 0;
      
      switch (sortType) {
        case 'latest':
          // 시간순 정렬
          result = b.timestamp - a.timestamp;
          break;
        
        case 'train':
          // 열차 번호순 정렬 (내림차순 기준: 큰 번호 -> 작은 번호)
          const trainNumA = parseInt(a.trainId);
          const trainNumB = parseInt(b.trainId);
          result = trainNumB - trainNumA;
          break;
        
        case 'task':
          // 수주일순 정렬
          if (!a.taskId && !b.taskId) {
            result = b.timestamp - a.timestamp;
          } else if (!a.taskId) {
            result = 1; // taskId 없는 것은 아래로
          } else if (!b.taskId) {
            result = -1;
          } else {
            const taskA = tasks.find(t => t.id === a.taskId);
            const taskB = tasks.find(t => t.id === b.taskId);
            
            if (!taskA && !taskB) {
              result = b.timestamp - a.timestamp;
            } else if (!taskA) {
              result = 1;
            } else if (!taskB) {
              result = -1;
            } else {
              // 수주일 날짜 비교
              const dateCompare = taskB.date.localeCompare(taskA.date);
              if (dateCompare !== 0) {
                result = dateCompare;
              } else {
                // 같은 수주일이면 timestamp로 정렬
                result = b.timestamp - a.timestamp;
              }
            }
          }
          break;
        
        default:
          result = b.timestamp - a.timestamp;
      }
      
      // 오름차순/내림차순 적용
      return sortOrder === 'asc' ? -result : result;
    });

  // 수주일별 완료 현황 계산
  const taskCompletionStatus = filterTaskId && tasks.length > 0
    ? (() => {
        const selectedTask = tasks.find(t => t.id === filterTaskId);
        if (!selectedTask) return null;
        
        const taskCheckins = checkins.filter(c => c.taskId === filterTaskId);
        const completedTrains = new Set(taskCheckins.map(c => c.trainId));
        
        // 열차별 체크인 정보 매핑 (가장 최근 체크인)
        const trainCheckinMap = new Map<string, CheckinWithPhoto>();
        taskCheckins.forEach(checkin => {
          const existing = trainCheckinMap.get(checkin.trainId);
          if (!existing || checkin.timestamp > existing.timestamp) {
            trainCheckinMap.set(checkin.trainId, checkin);
          }
        });
        
        const totalTrains = trains.length;
        const completedCount = completedTrains.size;
        
        return {
          task: selectedTask,
          completedTrains,
          trainCheckinMap,
          completedCount,
          totalTrains,
          percentage: totalTrains > 0 ? Math.round((completedCount / totalTrains) * 100) : 0
        };
      })()
    : null;

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
        <div className="filter-group">
          <label>수주일:</label>
          <select
            value={filterTaskId}
            onChange={(e) => setFilterTaskId(e.target.value)}
            className="filter-select"
          >
            <option value="">전체</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.date} {task.name && `- ${task.name}`}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>열차:</label>
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
      </div>

      {/* 정렬 */}
      <div className="sort-section">
        <div className="sort-header">
          <label>정렬:</label>
          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            title={sortOrder === 'desc' ? '내림차순' : '오름차순'}
          >
            {sortOrder === 'desc' ? '↓ 내림차순' : '↑ 오름차순'}
          </button>
        </div>
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortType === 'latest' ? 'active' : ''}`}
            onClick={() => setSortType('latest')}
          >
            🕐 시간순
          </button>
          <button
            className={`sort-btn ${sortType === 'train' ? 'active' : ''}`}
            onClick={() => setSortType('train')}
          >
            🚆 열차순
          </button>
          <button
            className={`sort-btn ${sortType === 'task' ? 'active' : ''}`}
            onClick={() => setSortType('task')}
          >
            📅 수주일순
          </button>
        </div>
      </div>

      {/* 수주일별 완료 현황 */}
      {taskCompletionStatus && (
        <div className="task-completion-section">
          <h2>📊 작업 진행 현황</h2>
          <div className="completion-summary">
            <div className="completion-info">
              <span className="task-date">{taskCompletionStatus.task.date}</span>
              {taskCompletionStatus.task.name && (
                <span className="task-name">- {taskCompletionStatus.task.name}</span>
              )}
            </div>
            <div className="completion-stats">
              <div className="stat-item">
                <span className="stat-label">완료</span>
                <span className="stat-value">
                  {taskCompletionStatus.completedCount} / {taskCompletionStatus.totalTrains}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">진행률</span>
                <span className="stat-value">{taskCompletionStatus.percentage}%</span>
              </div>
            </div>
          </div>
          
          <div className="train-checklist">
            {trains.map((train) => {
              const isCompleted = taskCompletionStatus.completedTrains.has(train.id);
              const checkin = taskCompletionStatus.trainCheckinMap.get(train.id);
              
              return (
                <div 
                  key={train.id} 
                  className={`train-check-item ${isCompleted ? 'completed' : ''} ${isCompleted ? 'clickable' : ''}`}
                  onClick={() => {
                    if (isCompleted && checkin) {
                      setSelectedCheckin(checkin);
                    }
                  }}
                >
                  <span className="check-icon">{isCompleted ? '✅' : '⬜️'}</span>
                  <span className="train-number">{train.id}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          checkins={filteredAndSortedCheckins}
          tasks={tasks}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onDateClick={handleDateClick}
        />
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <div className="checkin-list">
          {filteredAndSortedCheckins.length === 0 ? (
            <p className="empty-message">작업 히스토리가 없습니다.</p>
          ) : (
            filteredAndSortedCheckins.map((checkin) => {
              const task = checkin.taskId ? tasks.find(t => t.id === checkin.taskId) : null;
              return (
                <div
                  key={checkin.id}
                  className="checkin-card"
                  onClick={() => openModal(checkin)}
                >
                  <div className="card-header">
                    <div className="badge-group">
                      <span className="train-badge">열차 {checkin.trainNumber || checkin.trainId}</span>
                      <span className="platform-badge">플랫폼 {checkin.platform}번</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="timestamp">{formatDateTime(checkin.timestamp)}</p>
                    {task && (
                      <p className="task-info">📅 {task.date}{task.name ? ` - ${task.name}` : ''}</p>
                    )}
                    {checkin.notes && (
                      <p className="notes-preview">{checkin.notes.substring(0, 50)}{checkin.notes.length > 50 ? '...' : ''}</p>
                    )}
                    {checkin.photoKey && <span className="photo-icon">📷</span>}
                  </div>
                </div>
              );
            })
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
              
              {selectedCheckin.taskId && (
                <div className="detail-row">
                  <strong>수주일:</strong>
                  <span>
                    {(() => {
                      const task = tasks.find(t => t.id === selectedCheckin.taskId);
                      if (!task) return '알 수 없음';
                      return `${task.date}${task.name ? ` - ${task.name}` : ''}`;
                    })()}
                  </span>
                </div>
              )}
              
              {selectedCheckin.notes && (
                <div className="detail-row notes">
                  <strong>특이사항:</strong>
                  <p>{selectedCheckin.notes}</p>
                </div>
              )}

              {photoUrls.length > 0 && (
                <div className="detail-photos">
                  <strong>사진 ({photoUrls.length}장):</strong>
                  <div className="detail-photos-grid">
                    {photoUrls.map((url, index) => (
                      <div key={index} className="detail-photo-item">
                        <img src={url} alt={`체크인 사진 ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="edit-btn"
                onClick={() => {
                  openEditModal(selectedCheckin);
                }}
              >
                ✏️ 수정
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDelete(selectedCheckin)}
              >
                🗑️ 삭제
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

      {/* 카카오톡 공유 형식 선택 모달 */}
      {showKakaoShareModal && (
        <div className="modal-overlay" onClick={() => setShowKakaoShareModal(false)}>
          <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowKakaoShareModal(false)}>✕</button>
            
            <h2>카카오톡 공유 형식 선택</h2>
            <p className="modal-description">
              공유할 데이터 형식을 선택하세요.
            </p>

            <div className="export-options">
              <button className="option-btn" onClick={handleShareKakaoReadable}>
                <span className="option-icon">📝</span>
                <div className="option-text">
                  <strong>읽기 쉬운 형태</strong>
                  <small>사람이 보기 편한 텍스트 형태</small>
                </div>
              </button>

              <button className="option-btn" onClick={handleShareKakaoJSON}>
                <span className="option-icon">📋</span>
                <div className="option-text">
                  <strong>JSON 형태</strong>
                  <small>데이터 가져오기에 사용 가능</small>
                </div>
              </button>
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

      {/* 수정 모달 */}
      {showEditModal && selectedCheckin && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeEditModal}>✕</button>
            
            <h2>체크인 수정</h2>

            <div className="edit-form">
              <div className="form-group">
                <label>날짜</label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="form-input"
                  max={formatDate(Date.now())}
                />
              </div>

              <div className="form-group">
                <label>열차 일련번호</label>
                <select
                  value={editFormData.trainId}
                  onChange={(e) => setEditFormData({ ...editFormData, trainId: e.target.value })}
                  className="form-select"
                  required
                >
                  {trains.map((train) => (
                    <option key={train.id} value={train.id}>
                      {train.id}번
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>플랫폼</label>
                <div className="platform-toggle">
                  <button
                    type="button"
                    className={editFormData.platform === 1 ? 'active' : ''}
                    onClick={() => setEditFormData({ ...editFormData, platform: 1 })}
                  >
                    1번
                  </button>
                  <button
                    type="button"
                    className={editFormData.platform === 10 ? 'active' : ''}
                    onClick={() => setEditFormData({ ...editFormData, platform: 10 })}
                  >
                    10번
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>특이사항 (선택)</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="특이사항이 있으면 입력하세요"
                  className="form-textarea"
                  rows={4}
                />
              </div>

              {selectedCheckin.photoKey && (
                <div className="photo-note">
                  📷 사진은 수정할 수 없습니다. 삭제 후 다시 체크인해주세요.
                </div>
              )}

              <div className="edit-actions">
                <button
                  className="save-btn"
                  onClick={handleUpdateCheckin}
                >
                  💾 저장
                </button>
                <button
                  className="cancel-btn"
                  onClick={closeEditModal}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
