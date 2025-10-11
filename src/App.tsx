import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CheckinPage } from './features/checkin/CheckinPage';
import { HistoryPage } from './features/history/HistoryPage';
import { TrainsPage } from './features/trains/TrainsPage';
import { BottomNav } from './components/BottomNav';
import { OnlineStatus } from './components/OnlineStatus';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <OnlineStatus />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CheckinPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/trains" element={<TrainsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
