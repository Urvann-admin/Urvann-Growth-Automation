// Database configuration
export const databaseConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'urvann_growth_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'urvann_growth_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
};

export const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return databaseConfig[env as keyof typeof databaseConfig];
};










