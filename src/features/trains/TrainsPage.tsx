import { useState, useEffect } from 'react';
import type { Train } from '../../types';
import { getAllTrains, addTrain, deleteTrain } from '../../db/indexedDbClient';
import './TrainsPage.css';

export function TrainsPage() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [newTrainId, setNewTrainId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadTrains();
  }, []);

  async function loadTrains() {
    const trainList = await getAllTrains();
    setTrains(trainList);
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

  return (
    <div className="trains-page">
      <h1>열차 관리</h1>

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
        <h2>등록된 열차 ({trains.length})</h2>
        
        {trains.length === 0 ? (
          <p className="empty-message">등록된 열차가 없습니다.</p>
        ) : (
          <div className="train-items">
            {trains.map((train) => (
              <div key={train.id} className="train-item">
                <span className="train-id">{train.id}</span>
                <button
                  onClick={() => handleDelete(train.id)}
                  className="delete-btn"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
