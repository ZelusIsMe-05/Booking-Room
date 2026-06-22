'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
const SOCKET_URL = API_BASE.replace(/\/api$/, '');

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    console.log('[SOCKET] Connecting to:', SOCKET_URL);
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: `Bearer ${token}`
      },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
