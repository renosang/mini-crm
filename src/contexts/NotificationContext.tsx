import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Toast Container */}
      <div className="toast-container">
        {notifications.map((n) => {
          let icon = <FiInfo size={16} />;
          let color = '#0071E3'; // info: Apple Blue

          if (n.type === 'success') {
            icon = <FiCheckCircle size={16} />;
            color = '#34C759'; // Apple Green
          } else if (n.type === 'error') {
            icon = <FiAlertTriangle size={16} />;
            color = '#FF3B30'; // Apple Red
          } else if (n.type === 'warning') {
            icon = <FiAlertTriangle size={16} />;
            color = '#FF9500'; // Apple Orange
          }

          return (
            <div key={n.id} className={`toast-item toast-${n.type}`}>
              {/* Progress Line */}
              <div
                className="toast-progress"
                style={{
                  backgroundColor: color,
                }}
              />

              <div className="toast-icon" style={{ color: color }}>
                {icon}
              </div>
              <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4, paddingRight: '12px' }}>
                {n.message}
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#86868B',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '2px',
                  borderRadius: '50%',
                  marginTop: '1px',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FiX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};
