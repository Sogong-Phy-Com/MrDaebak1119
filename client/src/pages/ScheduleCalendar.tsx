import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './ScheduleCalendar.css';

const API_URL = process.env.REACT_APP_API_URL || (window.location.protocol === 'https:' ? '/api' : 'http://localhost:5000/api');

interface DeliverySchedule {
  id: number;
  order_id: number;
  employee_id: number;
  employee_name?: string;
  employee_phone?: string;
  delivery_address: string;
  departure_time: string;
  arrival_time: string;
  return_time: string;
  one_way_minutes: number;
  status: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const ScheduleCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, selectedEmployeeId, isAdmin]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }
    return {
      Authorization: `Bearer ${token}`
    };
  };

  const fetchEmployees = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/admin/users`, { headers });
      if (response.data && Array.isArray(response.data)) {
        const employeeList = response.data.filter((u: User) => u && u.role === 'employee');
        setEmployees(employeeList);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('직원 목록 조회 실패:', err);
      // Don't show error to user for employee list fetch failure
      // It's not critical - they can still use the calendar
      setEmployees([]);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return;
      }

      const headers = getAuthHeaders();
      const dateStr = currentDate.toISOString().split('T')[0];
      let url = `${API_URL}/employee/delivery-schedule?date=${dateStr}`;
      
      if (isAdmin && selectedEmployeeId) {
        url += `&employeeId=${selectedEmployeeId}`;
      }

      const response = await axios.get(url, { headers });
      if (response.data && Array.isArray(response.data)) {
        // Validate and filter out any invalid schedule objects
        const validSchedules = response.data.filter((schedule: any) => 
          schedule && 
          typeof schedule.id === 'number' &&
          typeof schedule.order_id === 'number' &&
          schedule.departure_time
        );
        setSchedules(validSchedules);
      } else {
        setSchedules([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('권한이 없습니다. 다시 로그인해주세요.');
        // Optionally redirect to login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const errorMsg = err.response?.data?.error || err.message || '배달 스케줄을 불러오는데 실패했습니다.';
        setError(errorMsg);
      }
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    try {
      if (!date || isNaN(date.getTime())) {
        date = new Date(); // Fallback to current date if invalid
      }
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Validate year and month
      if (year < 1900 || year > 2100 || month < 0 || month > 11) {
        date = new Date(); // Fallback to current date if invalid
        return getDaysInMonth(date);
      }
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const days: (Date | null)[] = [];
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        if (isNaN(dayDate.getTime())) {
          continue; // Skip invalid dates
        }
        days.push(dayDate);
      }
      return days;
    } catch {
      // Fallback: return current month
      return getDaysInMonth(new Date());
    }
  };

  const getSchedulesForDate = (date: Date | null): DeliverySchedule[] => {
    if (!date) return [];
    try {
      const dateStr = date.toISOString().split('T')[0];
      return schedules.filter(schedule => {
        if (!schedule || !schedule.departure_time) return false;
        try {
          const scheduleDate = new Date(schedule.departure_time);
          if (isNaN(scheduleDate.getTime())) return false;
          return scheduleDate.toISOString().split('T')[0] === dateStr;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      try {
        const newDate = new Date(prev);
        if (isNaN(newDate.getTime())) {
          return new Date(); // Fallback to current date if invalid
        }
        if (direction === 'prev') {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
        // Validate the new date
        if (isNaN(newDate.getTime())) {
          return new Date(); // Fallback to current date if invalid
        }
        return newDate;
      } catch {
        return new Date(); // Fallback to current date on error
      }
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatTime = (dateString: string) => {
    try {
      if (!dateString) return '--:--';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '--:--';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      SCHEDULED: '#4CAF50',
      IN_PROGRESS: '#2196F3',
      COMPLETED: '#9E9E9E',
      CANCELLED: '#F44336'
    };
    return colors[status] || '#757575';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      SCHEDULED: '배정됨',
      IN_PROGRESS: '배달 중',
      COMPLETED: '완료',
      CANCELLED: '취소'
    };
    return labels[status] || status;
  };

  const days = getDaysInMonth(currentDate);
  const monthYear = (() => {
    try {
      if (!currentDate || isNaN(currentDate.getTime())) {
        return new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
      }
      return currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    } catch {
      return new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    }
  })();

  return (
    <div className="schedule-calendar-page">
      <nav className="navbar">
        <div className="nav-container">
          <button onClick={() => navigate(isAdmin ? '/admin' : '/employee')} className="back-button">
            ←
          </button>
          <h1 className="logo">배달 스케줄 캘린더</h1>
        </div>
      </nav>

      <div className="container">
        {error && <div className="error">{error}</div>}

        {/* Employee Filter (Admin only) */}
        {isAdmin && (
          <div className="employee-filter">
            <label>직원 선택:</label>
            <select
              value={selectedEmployeeId || ''}
              onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null)}
              className="filter-select"
            >
              <option value="">전체 직원</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Calendar Controls */}
        <div className="calendar-controls">
          <button onClick={() => navigateMonth('prev')} className="btn btn-secondary">
            ← 이전 달
          </button>
          <h2>{monthYear}</h2>
          <button onClick={() => navigateMonth('next')} className="btn btn-secondary">
            다음 달 →
          </button>
          <button onClick={goToToday} className="btn btn-primary">
            오늘
          </button>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="loading">스케줄을 불러오는 중...</div>
        ) : (
          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-days">
              {days.map((date: Date | null, index: number) => {
                const daySchedules = getSchedulesForDate(date);
                const isToday = date && 
                  date.toDateString() === new Date().toDateString() &&
                  !isNaN(date.getTime());
                const isCurrentMonth = date !== null;

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    {date && (
                      <>
                        <div className="calendar-day-number">{date.getDate()}</div>
                        <div className="calendar-day-schedules">
                          {daySchedules.slice(0, 3).map(schedule => (
                            <div
                              key={schedule.id}
                              className="schedule-item"
                              style={{ borderLeftColor: getStatusColor(schedule.status) }}
                              title={`${schedule.employee_name || `직원 ${schedule.employee_id || 'N/A'}`} - ${schedule.delivery_address || '주소 없음'} (${formatTime(schedule.departure_time || '')})`}
                            >
                              <div className="schedule-time">{formatTime(schedule.departure_time)}</div>
                              <div className="schedule-status" style={{ color: getStatusColor(schedule.status) }}>
                                {getStatusLabel(schedule.status)}
                              </div>
                            </div>
                          ))}
                          {daySchedules.length > 3 && (
                            <div className="schedule-more">
                              +{daySchedules.length - 3}개 더
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule List for Selected Date */}
        <div className="schedule-list-section">
          <h3>일정 상세</h3>
          {schedules.length === 0 ? (
            <p className="no-schedules">선택한 날짜에 배달 스케줄이 없습니다.</p>
          ) : (
            <div className="schedule-list">
              {schedules.map(schedule => (
                <div key={schedule.id} className="schedule-card">
                      <div className="schedule-header">
                    <div>
                      <h4>주문 #{schedule.order_id || 'N/A'}</h4>
                      <p className="employee-name">
                        {schedule.employee_name || `직원 ${schedule.employee_id || 'N/A'}`}
                        {schedule.employee_phone && ` (${schedule.employee_phone})`}
                      </p>
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(schedule.status || 'SCHEDULED') }}
                    >
                      {getStatusLabel(schedule.status || 'SCHEDULED')}
                    </span>
                  </div>
                  <div className="schedule-details">
                    <div className="detail-item">
                      <span className="detail-label">배달 주소:</span>
                      <span className="detail-value">{schedule.delivery_address || '주소 없음'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">출발:</span>
                      <span className="detail-value">{formatTime(schedule.departure_time || '')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">도착:</span>
                      <span className="detail-value">{formatTime(schedule.arrival_time || '')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">복귀:</span>
                      <span className="detail-value">{formatTime(schedule.return_time || '')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">소요 시간:</span>
                      <span className="detail-value">{schedule.one_way_minutes || 0}분</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;

