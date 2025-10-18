import { Link, useLocation } from 'react-router-dom';
import './BottomNav.css';

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/checkin', label: '체크인', icon: '✓' },
    { path: '/', label: '히스토리', icon: '📋' },
    { path: '/trains', label: '설정', icon: '⚙️' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
