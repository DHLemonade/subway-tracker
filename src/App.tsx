import { HashRouter, Routes, Route } from 'react-router-dom';
import { CheckinPage } from './features/checkin/CheckinPage';
import { HistoryPage } from './features/history/HistoryPage';
import { TrainsPage } from './features/trains/TrainsPage';
import { BottomNav } from './components/BottomNav';
import { OnlineStatus } from './components/OnlineStatus';
import './App.css';

function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <OnlineStatus />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HistoryPage />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/trains" element={<TrainsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
