import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gpt-oss:20b',
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '3001', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};