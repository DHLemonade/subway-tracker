import { useMemo } from 'react';
import type { CheckinWithPhoto } from '../types';
import { formatDate } from '../utils/helpers';
import './CalendarView.css';

interface CalendarViewProps {
  checkins: CheckinWithPhoto[];
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  onDateClick: (date: string, checkins: CheckinWithPhoto[]) => void;
}

export function CalendarView({ checkins, selectedMonth, onMonthChange, onDateClick }: CalendarViewProps) {
  // 캘린더 데이터 계산
  const calendarData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    // 해당 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫 주의 시작일 (일요일 기준)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // 마지막 주의 종료일 (토요일 기준)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    // 날짜별 체크인 맵 생성
    const checkinsByDate = new Map<string, CheckinWithPhoto[]>();
    checkins.forEach(checkin => {
      const dateKey = formatDate(checkin.timestamp);
      if (!checkinsByDate.has(dateKey)) {
        checkinsByDate.set(dateKey, []);
      }
      checkinsByDate.get(dateKey)!.push(checkin);
    });
    
    // 주별 데이터 생성
    const weeks: Array<Array<{ date: Date; dateKey: string; isCurrentMonth: boolean; checkins: CheckinWithPhoto[] }>> = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const week: Array<{ date: Date; dateKey: string; isCurrentMonth: boolean; checkins: CheckinWithPhoto[] }> = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        const dateKey = formatDate(date.getTime());
        const isCurrentMonth = date.getMonth() === month;
        const dayCheckins = checkinsByDate.get(dateKey) || [];
        
        week.push({
          date,
          dateKey,
          isCurrentMonth,
          checkins: dayCheckins,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(week);
    }
    
    return weeks;
  }, [checkins, selectedMonth]);

  function handlePrevMonth() {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  }

  function handleNextMonth() {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  }

  function handleToday() {
    onMonthChange(new Date());
  }

  const monthName = selectedMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="month-nav-btn">‹</button>
        <h2 className="month-title">{monthName}</h2>
        <button onClick={handleNextMonth} className="month-nav-btn">›</button>
        <button onClick={handleToday} className="today-btn">오늘</button>
      </div>

      <div className="calendar-grid">
        {/* 요일 헤더 */}
        <div className="weekday-header">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div key={day} className={`weekday ${index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="dates-grid">
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => {
                const hasCheckins = day.checkins.length > 0;
                const isToday = day.dateKey === formatDate(Date.now());
                const isSunday = dayIndex === 0;
                const isSaturday = dayIndex === 6;

                return (
                  <div
                    key={day.dateKey}
                    className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${hasCheckins ? 'has-checkins' : ''} ${isToday ? 'today' : ''} ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}`}
                    onClick={() => hasCheckins && onDateClick(day.dateKey, day.checkins)}
                  >
                    <div className="day-number">{day.date.getDate()}</div>
                    {hasCheckins && (
                      <div className="checkin-indicator">
                        <span className="checkin-count">{day.checkins.length}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
