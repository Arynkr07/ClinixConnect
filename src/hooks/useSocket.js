import { useEffect, useRef, useState } from 'react';

/**
 * useSocket - lightweight mock WebSocket hook.
 * In production this connects to a real socket server (e.g. Socket.io).
 * @param {string} url - socket endpoint
 * @param {Object} options - { enabled, onMessage }
 */
export const useSocket = (url, options = {}) => {
  const { enabled = false, onMessage } = options;
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled || !url) return undefined;

    // Placeholder for a real WebSocket connection.
    const socket = { connected: true, close: () => {} };
    socketRef.current = socket;
    setConnected(true);

    // Simulated heartbeat / inbound events for the demo.
    const interval = setInterval(() => {
      const demoEvent = {
        type: 'notification',
        payload: {
          id: `evt-${Date.now()}`,
          message: 'Queue updated',
          timestamp: new Date().toISOString(),
        },
      };
      setEvents((prev) => [...prev, demoEvent]);
      onMessage?.(demoEvent);
    }, 30000);

    return () => {
      clearInterval(interval);
      socketRef.current?.close();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url]);

  const emit = (event, payload) => {
    console.log('socket emit', event, payload);
  };

  return { connected, events, emit };
};
