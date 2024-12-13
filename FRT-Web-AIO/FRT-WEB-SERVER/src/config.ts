
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  database: {
    baseURL: string;
    apiKey: string;
  };
}

const config: Config = {
  database: {
    baseURL: process.env.DATABASE_SERVICE_URL || `http://localhost:8095/api/v1`,
    apiKey: 'badihi'
  }
};

export default config;
