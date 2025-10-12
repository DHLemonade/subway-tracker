import { useState, useEffect } from 'react';
import type { Train, Task } from '../../types';
import { getAllTrains, addTrain, deleteTrain, calculateStorageSize, deleteOldPhotos, getAllTasks, addTask, deleteTask } from '../../db/indexedDbClient';
import { formatFileSize, generateId, formatDate } from '../../utils/helpers';
import './TrainsPage.css';

export function TrainsPage() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [newTrainId, setNewTrainId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ total: number; photos: number; data: number } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  
  // 수주일 관리
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDate, setNewTaskDate] = useState<string>(formatDate(Date.now()));
  const [newTaskName, setNewTaskName] = useState<string>('');

  useEffect(() => {
    loadTrains();
    loadStorageInfo();
    loadTasks();
  }, []);

  async function loadStorageInfo() {
    const info = await calculateStorageSize();
    setStorageInfo(info);
  }

  async function loadTrains() {
    const trainList = await getAllTrains();
    setTrains(trainList);
  }

  async function loadTasks() {
    const taskList = await getAllTasks();
    setTasks(taskList);
  }

  async function handleAddTask() {
    const taskDate = newTaskDate.trim();
    
    if (!taskDate) {
      alert('날짜를 선택해주세요.');
      return;
    }

    setIsAdding(true);

    try {
      const task: Task = {
        id: generateId(),
        date: taskDate,
        name: newTaskName.trim() || undefined,
        createdAt: Date.now(),
      };

      await addTask(task);
      await loadTasks();
      setNewTaskDate(formatDate(Date.now()));
      setNewTaskName('');
      alert('수주일이 등록되었습니다.');
    } catch (error) {
      console.error('수주일 등록 실패:', error);
      alert('수주일 등록에 실패했습니다.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteTask(taskId: string, taskDate: string) {
    if (!confirm(`"${taskDate}" 수주일을 삭제하시겠습니까?`)) return;

    try {
      await deleteTask(taskId);
      await loadTasks();
      alert('수주일이 삭제되었습니다.');
    } catch (error) {
      console.error('수주일 삭제 실패:', error);
      alert('수주일 삭제에 실패했습니다.');
    }
  }

  async function handleAdd() {
    const trainId = newTrainId.trim();
    
    if (!trainId) {
      alert('열차 일련번호를 입력해주세요.');
      return;
    }

    // 중복 체크
    if (trains.some((t) => t.id === trainId)) {
      alert('이미 등록된 열차입니다.');
      return;
    }

    setIsAdding(true);

    try {
      const train: Train = {
        id: trainId,
        createdAt: Date.now(),
      };

      await addTrain(train);
      await loadTrains();
      setNewTrainId('');
      alert('열차가 등록되었습니다.');
    } catch (error) {
      console.error('열차 등록 실패:', error);
      alert('열차 등록에 실패했습니다.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(trainId: string) {
    if (!confirm(`"${trainId}" 열차를 삭제하시겠습니까?`)) return;

    try {
      await deleteTrain(trainId);
      await loadTrains();
      alert('열차가 삭제되었습니다.');
    } catch (error) {
      console.error('열차 삭제 실패:', error);
      alert('열차 삭제에 실패했습니다.');
    }
  }

  async function handleInitializeDefaultTrains() {
    if (!confirm('16개의 기본 열차(368-370, 387-399)를 추가하시겠습니까?')) return;

    setIsAdding(true);
    try {
      const defaultTrainNumbers = [368, 369, 370, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399];
      let addedCount = 0;
      
      for (const trainNum of defaultTrainNumbers) {
        const trainId = trainNum.toString();
        // 중복 체크
        if (!trains.some((t) => t.id === trainId)) {
          await addTrain({
            id: trainId,
            createdAt: Date.now(),
          });
          addedCount++;
        }
      }
      
      await loadTrains();
      alert(`${addedCount}개의 열차가 추가되었습니다.`);
    } catch (error) {
      console.error('기본 열차 추가 실패:', error);
      alert('열차 추가에 실패했습니다.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleCleanOldPhotos(days: number) {
    if (!confirm(`${days}일 이상 지난 사진을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;

    setIsCleaning(true);
    try {
      const deletedCount = await deleteOldPhotos(days);
      await loadStorageInfo();
      alert(`${deletedCount}개의 사진이 삭제되었습니다.`);
    } catch (error) {
      console.error('사진 정리 실패:', error);
      alert('사진 정리에 실패했습니다.');
    } finally {
      setIsCleaning(false);
    }
  }

  return (
    <div className="trains-page">
      <h1>설정</h1>

      {/* 수주일 관리 */}
      <h2>📅 수주일 관리</h2>
      <div className="task-add-section">
        <input
          type="date"
          value={newTaskDate}
          onChange={(e) => setNewTaskDate(e.target.value)}
          className="task-date-input"
        />
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="작업명 (선택)"
          className="task-name-input"
        />
        <button
          onClick={handleAddTask}
          className="task-add-btn"
          disabled={isAdding}
        >
          {isAdding ? '등록 중...' : '등록'}
        </button>
      </div>

      <div className="tasks-list">
        <h3>등록된 수주일 ({tasks.length}개)</h3>
        
        {tasks.length === 0 ? (
          <p className="empty-message">등록된 수주일이 없습니다.</p>
        ) : (
          <div className="task-items">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-info">
                  <span className="task-date">{task.date}</span>
                  {task.name && <span className="task-name">{task.name}</span>}
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id, task.date)}
                  className="task-delete-btn"
                  aria-label="삭제"
                  title="삭제"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 저장소 정보 */}
      {storageInfo && (
        <div className="storage-info">
          <h2>💾 저장소 사용량</h2>
          <div className="storage-details">
            <div className="storage-item">
              <span className="label">전체:</span>
              <span className="value">{formatFileSize(storageInfo.total)}</span>
            </div>
            <div className="storage-item">
              <span className="label">사진:</span>
              <span className="value">{formatFileSize(storageInfo.photos)}</span>
            </div>
            <div className="storage-item">
              <span className="label">데이터:</span>
              <span className="value">{formatFileSize(storageInfo.data)}</span>
            </div>
          </div>
          <div className="storage-actions">
            <button
              className="clean-btn"
              onClick={() => handleCleanOldPhotos(30)}
              disabled={isCleaning}
            >
              30일 이상 사진 삭제
            </button>
            <button
              className="clean-btn"
              onClick={() => handleCleanOldPhotos(60)}
              disabled={isCleaning}
            >
              60일 이상 사진 삭제
            </button>
          </div>
        </div>
      )}

      {/* 기본 열차 추가 */}
      <div className="quick-add-section">
        <button
          className="quick-add-btn"
          onClick={handleInitializeDefaultTrains}
          disabled={isAdding}
        >
          🚇 기본 열차 16개 추가
        </button>
        <p className="quick-add-desc">368-370, 387-399번 열차</p>
      </div>

      <h2>열차 일련번호 관리</h2>

      {/* 열차 추가 */}
      <div className="add-section">
        <input
          type="text"
          value={newTrainId}
          onChange={(e) => setNewTrainId(e.target.value)}
          placeholder="열차 일련번호 입력"
          className="train-input"
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="add-btn"
          disabled={isAdding || !newTrainId.trim()}
        >
          {isAdding ? '등록 중...' : '추가'}
        </button>
      </div>

      {/* 열차 목록 */}
      <div className="trains-list">
        <h3>등록된 열차 ({trains.length}개)</h3>
        
        {trains.length === 0 ? (
          <p className="empty-message">등록된 열차가 없습니다.</p>
        ) : (
          <div className="train-items">
            {trains.map((train) => (
              <div key={train.id} className="train-item">
                <span className="train-id">{train.id}번</span>
                <button
                  onClick={() => handleDelete(train.id)}
                  className="delete-btn"
                  aria-label="삭제"
                  title="삭제"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
