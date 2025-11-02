// Application configuration
export const appConfig = {
  name: 'Urvann Growth Automation',
  version: '1.0.0',
  description: 'Growth automation platform for Urvann',
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  environment: process.env.NODE_ENV || 'development',
  
  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || '/api',
    timeout: 30000,
    retries: 3,
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
    bcryptRounds: 12,
    sessionMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  
  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
    ],
  },
  
  // Email
  email: {
    from: process.env.EMAIL_FROM || 'noreply@urvann.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@urvann.com',
  },
  
  // Features
  features: {
    analytics: true,
    automation: true,
    teamCollaboration: true,
    apiAccess: true,
  },
};










