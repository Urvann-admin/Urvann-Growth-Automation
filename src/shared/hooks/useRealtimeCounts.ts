'use client';

import { useState, useEffect, useRef } from 'react';

export interface RealtimeCountsState {
  counts: Record<string, Record<string, number>>;
  connected: boolean;
  loading: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

/**
 * React hook for real-time product counts using Server-Sent Events (SSE)
 * Automatically connects to the SSE endpoint and updates state when DB changes
 */
export function useRealtimeCounts(
  categories: string[],
  substores: string[]
): RealtimeCountsState {
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (categories.length === 0 || substores.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const connect = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const url = `/api/products/count/stream?categories=${categories.join(',')}&substores=${substores.join(',')}`;
        console.log('[useRealtimeCounts] Connecting to SSE:', url);
        
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          if (isMounted) {
            console.log('[useRealtimeCounts] Connected to SSE');
            setConnected(true);
            setError(null);
          }
        };

        eventSource.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'initial') {
              console.log('[useRealtimeCounts] Received initial data');
              setCounts(message.data);
              setLastUpdate(new Date(message.timestamp));
              setLoading(false);
            } else if (message.type === 'update') {
              console.log('[useRealtimeCounts] Received update:', message.changed);
              setCounts(message.data);
              setLastUpdate(new Date(message.timestamp));
            } else if (message.type === 'error') {
              console.error('[useRealtimeCounts] Server error:', message.message);
              setError(message.message);
              setLoading(false);
            }
          } catch (err) {
            console.error('[useRealtimeCounts] Failed to parse message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('[useRealtimeCounts] SSE error:', err);
          
          if (isMounted) {
            setConnected(false);
            setError('Connection lost. Reconnecting...');
            
            // Attempt to reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                console.log('[useRealtimeCounts] Attempting to reconnect...');
                connect();
              }
            }, 5000);
          }
          
          eventSource.close();
        };

      } catch (err) {
        console.error('[useRealtimeCounts] Failed to connect:', err);
        if (isMounted) {
          setError('Failed to connect to real-time updates');
          setLoading(false);
        }
      }
    };

    // Initial connection
    connect();

    // Cleanup
    return () => {
      isMounted = false;
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [categories.join(','), substores.join(',')]);

  return {
    counts,
    connected,
    loading,
    lastUpdate,
    error,
  };
}

