import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// One shared socket. Reconnects with the user's token after login/logout so private rooms work.
export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => { s.close(); };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

// useLive('article:published', (payload) => ...)
export function useLive(event, handler) {
  const socket = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (p) => ref.current(p);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
