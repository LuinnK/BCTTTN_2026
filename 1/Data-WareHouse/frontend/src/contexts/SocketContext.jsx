import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.DEV ? 'http://localhost:5000' : undefined;
    const s = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('stock_alert', (data) => {
      addToast(data.message, 'warning');
      setAlerts((prev) => [
        { id: Date.now(), message: data.message, type: 'warning', time: new Date() },
        ...prev,
      ]);
    });

    s.on('inventory_updated', (data) => {
      addToast(data.message, 'info');
      setAlerts((prev) => [
        { id: Date.now(), message: data.message, type: 'info', time: new Date() },
        ...prev,
      ]);
    });

    s.on('inventory_adjusted', (data) => {
      const msg = `Kiểm kê: ${data.sku} tại ${data.binCode} chênh lệch ${data.discrepancy > 0 ? '+' : ''}${data.discrepancy}`;
      addToast(msg, 'warning');
      setAlerts((prev) => [
        { id: Date.now(), message: msg, type: 'warning', time: new Date() },
        ...prev,
      ]);
    });

    setSocket(s);
    return () => s.disconnect();
  }, [token, addToast]);

  return (
    <SocketContext.Provider value={{ socket, connected, alerts }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be inside SocketProvider');
  return ctx;
}
