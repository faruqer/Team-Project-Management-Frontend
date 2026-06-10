'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/auth-storage';
import { getApiUrl } from '@/lib/api-url';

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(getApiUrl(), {
      autoConnect: false,
      auth: { token: getAccessToken() },
    });
  }
  return sharedSocket;
}

export function useSocket(
  token: string | null,
  handlers: {
    onNotification?: (data: unknown) => void;
    onTaskCreated?: (data: unknown) => void;
    onTaskUpdated?: (data: unknown) => void;
    onTaskDeleted?: (data: unknown) => void;
    onActivity?: (data: unknown) => void;
  },
  projectId?: string,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token) return;

    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const onNotification = (data: unknown) => handlersRef.current.onNotification?.(data);
    const onTaskCreated = (data: unknown) => handlersRef.current.onTaskCreated?.(data);
    const onTaskUpdated = (data: unknown) => handlersRef.current.onTaskUpdated?.(data);
    const onTaskDeleted = (data: unknown) => handlersRef.current.onTaskDeleted?.(data);
    const onActivity = (data: unknown) => handlersRef.current.onActivity?.(data);

    socket.on('notification:new', onNotification);
    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('activity:new', onActivity);

    if (projectId) {
      socket.emit('join:project', projectId);
    }

    return () => {
      socket.off('notification:new', onNotification);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('activity:new', onActivity);

      if (projectId) {
        socket.emit('leave:project', projectId);
      }
    };
  }, [token, projectId]);
}
