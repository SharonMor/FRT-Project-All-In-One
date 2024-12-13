import axios, { AxiosInstance } from 'axios';
import config from './config';
import RequestType from './types/RequestType';

interface DatabaseConfig {
  baseURL: string;
  apiKey: string;
}

class Database {
  private static instance: Database;
  private client: AxiosInstance;

  private constructor({ baseURL, apiKey }: DatabaseConfig) {
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        'api-key': apiKey
      }
    });
  }

  static getInstance(config: DatabaseConfig): Database {
    if (!Database.instance) {
      Database.instance = new Database(config);
    }
    return Database.instance;
  }


  async get(collection: string, key: string, requestType: number) {
    try {
      const response = await this.client.get(`/get/${requestType}/${collection},${key}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to retrieve key ${collection},${key}:`, error);
      throw error;
    }
  }


  async post(key: string, value: any, requestType: RequestType) {
    try {
      const url = `/post/${requestType}/${key}`;
      const response = await this.client.post(url, value);
      return response.data;
    } catch (error) {
      console.error(`Failed to post value for key ${key} with request type ${requestType}:`, error);
      throw error;
    }
  }

  async update(requestType: RequestType, key: string, value: any) {
    try {
      const response = await this.client.put(`/update/${requestType}/${key}`, value, {
        headers: {
          'api-key': 'badihi'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to update value for key ${key}:`, error);
      throw error;
    }
  }

  async delete(collection: string, key: string) {
    try {
      const response = await this.client.delete(`/delete/${collection}/${key}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }
}

const instance = Database.getInstance({ baseURL: config.database.baseURL, apiKey: config.database.apiKey });
Object.freeze(instance);

export default instance;
