'use client';

import { useEffect, useState } from 'react';

/**
 * Component that initializes the background worker on client mount
 * This ensures the worker starts automatically when the app loads
 */
export function WorkerInitializer() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      // Call the worker init endpoint
      fetch('/api/worker/init')
        .then(res => res.json())
        .then(data => {
          console.log('[WorkerInitializer]', data.message);
          setInitialized(true);
        })
        .catch(err => {
          console.error('[WorkerInitializer] Failed to start worker:', err);
        });
    }
  }, [initialized]);

  return null; // This component doesn't render anything
}

