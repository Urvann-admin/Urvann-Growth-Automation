/**
 * Initialize cron jobs when the server starts
 * This file should be imported early in the application lifecycle
 */

import { initializeCronJobs } from './cronService';

// Initialize cron jobs when this module is imported
// This will only run on the server side
if (typeof window === 'undefined') {
  // Only initialize if we're on the server
  initializeCronJobs();
}
