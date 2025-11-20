import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || (window.location.protocol === 'https:' ? '/api' : 'http://localhost:5000/api');

interface User {
  id: number;
  email: string;
  name: string;
  address: string;
  phone: string;
  role: string;
}

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

interface InventoryItem {
  menu_item_id: number;
  menu_item_name?: string;
  menu_item_name_en?: string;
  category?: string;
  capacity_per_window: number;
  reserved: number;
  remaining: number;
  window_start: string;
  window_end: string;
  notes?: string;
}

const scheduleStatusOptions = [
  { value: 'SCHEDULED', label: '배정됨' },
  { value: 'IN_PROGRESS', label: '배달 중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소' }
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [userError, setUserError] = useState('');

  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [restockValues, setRestockValues] = useState<Record<number, number>>({});
  const [restockNotes, setRestockNotes] = useState<Record<number, string>>({});
  const [restockMessage, setRestockMessage] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchInventory();
  }, []);

  useEffect(() => {
    fetchDeliverySchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleDate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('관리자 로그인이 필요합니다.');
    }
    return {
      Authorization: `Bearer ${token}`
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/admin/users`, { headers });
      setUsers(response.data);
      setUserError('');
    } catch (err: any) {
      setUserError(err.message || '회원 정보를 불러오는데 실패했습니다.');
      if (err.response?.status === 403) {
        setUserError('관리자 권한이 필요합니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliverySchedules = async () => {
    try {
      setScheduleLoading(true);
      setScheduleError('');
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/employee/delivery-schedule?date=${scheduleDate}`, { headers });
      if (response.data && Array.isArray(response.data)) {
        setSchedules(response.data);
      } else if (response.data?.error) {
        setScheduleError(response.data.error);
      } else {
        setSchedules([]);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '배달 스케줄을 불러오는데 실패했습니다.';
      setScheduleError(errorMsg);
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const updateScheduleStatus = async (scheduleId: number, status: string) => {
    try {
      setScheduleError('');
      const headers = getAuthHeaders();
      await axios.patch(`${API_URL}/employee/delivery-schedule/${scheduleId}/status`, { status }, { headers });
      await fetchDeliverySchedules();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '스케줄 상태를 변경하는 데 실패했습니다.';
      setScheduleError(errorMsg);
    }
  };

  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError('');
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/inventory`, { headers });
      if (response.data && Array.isArray(response.data)) {
        setInventoryItems(response.data);
        const defaultValues: Record<number, number> = {};
        const defaultNotes: Record<number, string> = {};
        response.data.forEach((item: InventoryItem) => {
          defaultValues[item.menu_item_id] = item.capacity_per_window;
          defaultNotes[item.menu_item_id] = item.notes || '';
        });
        setRestockValues(defaultValues);
        setRestockNotes(defaultNotes);
      } else {
        setInventoryItems([]);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '재고 정보를 불러오는데 실패했습니다.';
      setInventoryError(errorMsg);
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleRestock = async (menuItemId: number) => {
    const capacity = restockValues[menuItemId];
    if (!capacity || capacity <= 0) {
      setRestockMessage('보충 수량은 1 이상이어야 합니다.');
      setTimeout(() => setRestockMessage(''), 3000);
      return;
    }
    try {
      setRestockMessage('');
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/inventory/${menuItemId}/restock`, {
        capacity_per_window: capacity,
        notes: restockNotes[menuItemId] || ''
      }, { headers });
      setRestockMessage('재고가 성공적으로 업데이트되었습니다.');
      setTimeout(() => setRestockMessage(''), 3000);
      await fetchInventory();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '재고 보충에 실패했습니다.';
      setRestockMessage(errorMsg);
      setTimeout(() => setRestockMessage(''), 5000);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      customer: '고객',
      employee: '직원',
      admin: '관리자'
    };
    return labels[role] || role;
  };

  const getRoleClass = (role: string) => {
    const classes: { [key: string]: string } = {
      customer: 'role-customer',
      employee: 'role-employee',
      admin: 'role-admin'
    };
    return classes[role] || '';
  };

  const getScheduleStatusClass = (status: string) => {
    return `status-badge schedule-${status}`;
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString('ko-KR', { hour12: false });
  };

  const filteredUsers = filter === 'all'
    ? users
    : users.filter(user => user.role === filter);

  const stats = {
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    employees: users.filter(u => u.role === 'employee').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="admin-dashboard">
      <nav className="navbar">
        <div className="nav-container">
          <button onClick={() => navigate('/')} className="back-button">
            ←
          </button>
          <h1 className="logo">관리자 대시보드</h1>
        </div>
      </nav>

      <div className="container">
        <div className="admin-section">
          <h2>회원 관리</h2>
          {userError && <div className="error">{userError}</div>}

          <div className="stats-section">
            <div className="stat-card">
              <h3>전체 회원</h3>
              <p className="stat-number">{stats.total}</p>
            </div>
            <div className="stat-card">
              <h3>고객</h3>
              <p className="stat-number">{stats.customers}</p>
            </div>
            <div className="stat-card">
              <h3>직원</h3>
              <p className="stat-number">{stats.employees}</p>
            </div>
            <div className="stat-card">
              <h3>관리자</h3>
              <p className="stat-number">{stats.admins}</p>
            </div>
          </div>

          <div className="filter-section">
            <label>필터:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">전체</option>
              <option value="customer">고객</option>
              <option value="employee">직원</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>전화번호</th>
                  <th>주소</th>
                  <th>역할</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.address}</td>
                      <td>
                        <span className={`role-badge ${getRoleClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0 }}>배달 스케줄 관리</h2>
            <button
              onClick={() => navigate('/schedule')}
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
            >
              📅 캘린더 보기
            </button>
          </div>
          {scheduleError && <div className="error">{scheduleError}</div>}
          <div className="section-controls">
            <label>조회 날짜</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>

          <div className="users-table">
            {scheduleLoading ? (
              <div className="loading">스케줄을 불러오는 중...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>직원</th>
                    <th>주문</th>
                    <th>출발</th>
                    <th>도착</th>
                    <th>복귀</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
                        지정된 날짜의 배달 스케줄이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    schedules.map(schedule => (
                      <tr key={schedule.id}>
                        <td>{schedule.id}</td>
                        <td>
                          <div className="text-strong">{schedule.employee_name || `직원 ${schedule.employee_id}`}</div>
                          <div className="text-muted">{schedule.employee_phone}</div>
                        </td>
                        <td>
                          <div>주문 #{schedule.order_id}</div>
                          <div className="text-muted">{schedule.delivery_address}</div>
                        </td>
                        <td>{formatDateTime(schedule.departure_time)}</td>
                        <td>{formatDateTime(schedule.arrival_time)}</td>
                        <td>{formatDateTime(schedule.return_time)}</td>
                        <td>
                          <span className={getScheduleStatusClass(schedule.status)}>
                            {scheduleStatusOptions.find(s => s.value === schedule.status)?.label || schedule.status}
                          </span>
                        </td>
                        <td>
                          <select
                            value={schedule.status}
                            onChange={(e) => updateScheduleStatus(schedule.id, e.target.value)}
                          >
                            {scheduleStatusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="admin-section">
          <h2>재고 관리</h2>
          {inventoryError && <div className="error">{inventoryError}</div>}
          {restockMessage && <div className="success">{restockMessage}</div>}

          <div className="users-table">
            {inventoryLoading ? (
              <div className="loading">재고를 불러오는 중...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>메뉴</th>
                    <th>카테고리</th>
                    <th>현재 용량</th>
                    <th>예약</th>
                    <th>잔여</th>
                    <th>보충 창</th>
                    <th>비고</th>
                    <th>보충</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
                        등록된 재고가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    inventoryItems.map(item => (
                      <tr key={item.menu_item_id}>
                        <td>
                          <div className="text-strong">{item.menu_item_name || `메뉴 ${item.menu_item_id}`}</div>
                          <div className="text-muted">{item.menu_item_name_en}</div>
                        </td>
                        <td>{item.category || '-'}</td>
                        <td>{item.capacity_per_window?.toLocaleString()}개</td>
                        <td>{item.reserved?.toLocaleString()}개</td>
                        <td>{item.remaining?.toLocaleString()}개</td>
                        <td>
                          <div>{formatDateTime(item.window_start)}</div>
                          <div className="text-muted">~ {formatDateTime(item.window_end)}</div>
                        </td>
                        <td>{item.notes || '-'}</td>
                        <td>
                          <div className="restock-controls">
                            <input
                              type="number"
                              min={1}
                              value={restockValues[item.menu_item_id] ?? item.capacity_per_window}
                              onChange={(e) =>
                                setRestockValues(prev => ({
                                  ...prev,
                                  [item.menu_item_id]: Number(e.target.value)
                                }))
                              }
                            />
                            <input
                              type="text"
                              placeholder="메모 (선택)"
                              value={restockNotes[item.menu_item_id] ?? ''}
                              onChange={(e) =>
                                setRestockNotes(prev => ({
                                  ...prev,
                                  [item.menu_item_id]: e.target.value
                                }))
                              }
                            />
                            <button
                              className="btn btn-primary"
                              onClick={() => handleRestock(item.menu_item_id)}
                            >
                              보충
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


