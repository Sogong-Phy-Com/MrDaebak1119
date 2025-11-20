import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EmployeeDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || (window.location.protocol === 'https:' ? '/api' : 'http://localhost:5000/api');

interface OrderItem {
  id: number;
  menu_item_id: number;
  name: string;
  name_en: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  dinner_name: string;
  dinner_name_en: string;
  serving_style: string;
  delivery_time: string;
  delivery_address: string;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
}

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    setIsAdmin(user?.role === 'admin');
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchOrders = async () => {
    console.log('[EmployeeDashboard] 주문 목록 조회 시작');
    
    try {
      const token = localStorage.getItem('token');
      console.log('[EmployeeDashboard] 토큰 확인:', token ? '토큰 존재' : '토큰 없음');
      
      if (!token) {
        setError('[에러] 로그인이 필요합니다. (토큰 없음)');
        setLoading(false);
        return;
      }

      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      console.log('[EmployeeDashboard] 사용자 정보:', user ? `ID: ${user.id}, 역할: ${user.role}` : '사용자 정보 없음');

      const url = filterStatus
        ? `${API_URL}/employee/orders?status=${filterStatus}`
        : `${API_URL}/employee/orders`;
      
      console.log('[EmployeeDashboard] API 요청 URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[EmployeeDashboard] API 응답 성공:', response.data);
      setOrders(response.data);
    } catch (err: any) {
      console.error('[EmployeeDashboard] 주문 목록 조회 실패');
      console.error('[EmployeeDashboard] 에러:', err);
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        console.error('[EmployeeDashboard] HTTP 상태 코드:', status);
        console.error('[EmployeeDashboard] 응답 데이터:', errorData);
        
        if (status === 403) {
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          setError(`[권한 없음] 직원 권한이 필요합니다. (상태: 403)\n현재 역할: ${user?.role || '알 수 없음'}\n상세: ${JSON.stringify(errorData)}`);
        } else if (status === 401) {
          setError(`[인증 실패] 로그인이 필요합니다. (상태: 401)\n상세: ${JSON.stringify(errorData)}`);
        } else {
          setError(`[오류] 주문 목록을 불러오는데 실패했습니다. (상태: ${status})\n상세: ${JSON.stringify(errorData)}`);
        }
      } else {
        setError('[오류] 주문 목록을 불러오는데 실패했습니다.\n서버에 연결할 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      const response = await axios.patch(`${API_URL}/employee/orders/${orderId}/status`, {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data?.message) {
        console.log('[EmployeeDashboard] 주문 상태 업데이트 성공:', response.data.message);
      }

      await fetchOrders();
    } catch (err: any) {
      console.error('[EmployeeDashboard] 주문 상태 업데이트 실패:', err);
      const errorMsg = err.response?.data?.error || err.message || '주문 상태 업데이트에 실패했습니다.';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!window.confirm('정말로 이 주문을 취소하시겠습니까?\n\n취소된 주문의 재고 예약과 배달 스케줄도 함께 취소됩니다.')) {
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      const response = await axios.post(`${API_URL}/employee/orders/${orderId}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success message
      if (response.data?.message) {
        setError(''); // Clear any previous errors
        // You could add a success state here if needed
        console.log('[EmployeeDashboard] 주문 취소 성공:', response.data.message);
      }
      
      await fetchOrders();
    } catch (err: any) {
      console.error('[EmployeeDashboard] 주문 취소 실패:', err);
      const errorMsg = err.response?.data?.error || err.message || '주문 취소에 실패했습니다.';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const url = filterStatus
        ? `${API_URL}/employee/orders/export?status=${filterStatus}`
        : `${API_URL}/employee/orders/export`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });

      // Create download link
      const url_blob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url_blob;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'orders.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url_blob);
    } catch (err: any) {
      console.error('[EmployeeDashboard] 엑셀 다운로드 실패:', err);
      if (err.response) {
        setError(`엑셀 다운로드에 실패했습니다. (상태: ${err.response.status})`);
      } else {
        setError('엑셀 다운로드에 실패했습니다.');
      }
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: '대기 중',
      cooking: '조리 중',
      ready: '준비 완료',
      out_for_delivery: '배달 중',
      delivered: '배달 완료',
      cancelled: '취소됨'
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: { [key: string]: string } = {
      pending: 'status-pending',
      cooking: 'status-cooking',
      ready: 'status-ready',
      out_for_delivery: 'status-delivery',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classes[status] || '';
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: { [key: string]: string } = {
      pending: 'cooking',
      cooking: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="employee-dashboard">
      <nav className="navbar">
        <div className="nav-container">
          <button onClick={() => navigate('/')} className="back-button">
            ←
          </button>
          <h1 className="logo">직원 대시보드</h1>
        </div>
      </nav>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>주문 관리</h2>
          <button
            onClick={() => navigate('/schedule')}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            📅 스케줄 캘린더
          </button>
        </div>

        <div className="filter-section">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label>상태 필터:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">전체</option>
              <option value="pending">대기 중</option>
              <option value="cooking">조리 중</option>
              <option value="ready">준비 완료</option>
              <option value="out_for_delivery">배달 중</option>
              <option value="delivered">배달 완료</option>
              <option value="cancelled">취소됨</option>
            </select>
            <button
              onClick={exportToExcel}
              className="btn btn-primary"
              style={{ marginLeft: '10px' }}
            >
              📊 엑셀 다운로드
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="orders-list">
          {orders.length === 0 ? (
            <div className="no-orders">
              <p>주문이 없습니다.</p>
            </div>
          ) : (
            orders.map(order => {
              const nextStatus = getNextStatus(order.status);
              return (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3>주문 #{order.id} - {order.dinner_name}</h3>
                      <p className="customer-info">
                        고객: {order.customer_name} ({order.customer_phone})
                      </p>
                    </div>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="order-details">
                    <div className="detail-row">
                      <span className="label">서빙 스타일:</span>
                      <span>{order.serving_style}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">배달 시간:</span>
                      <span>{new Date(order.delivery_time).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">배달 주소:</span>
                      <span>{order.delivery_address}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">주문 시간:</span>
                      <span>{new Date(order.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">총 가격:</span>
                      <span><strong>{order.total_price.toLocaleString()}원</strong></span>
                    </div>
                  </div>

                  <div className="order-items-section">
                    <h4>주문 항목:</h4>
                    <ul>
                      {order.items.map(item => (
                        <li key={item.id}>
                          {item.name} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="order-actions">
                    {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, nextStatus)}
                        className="btn btn-success"
                      >
                        {getStatusLabel(nextStatus)}로 변경
                      </button>
                    )}
                    {isAdmin && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="btn btn-danger"
                        style={{ marginLeft: '10px' }}
                      >
                        주문 취소
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

