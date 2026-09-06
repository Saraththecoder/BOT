import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

// Local fallback file path
const LOCAL_KV_PATH = path.join(process.cwd(), '.kv-fallback.json');

function readLocalKV() {
  if (!fs.existsSync(LOCAL_KV_PATH)) {
    return {};
  }
  try {
    const data = fs.readFileSync(LOCAL_KV_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local KV fallback:', error);
    return {};
  }
}

function writeLocalKV(data: any) {
  try {
    fs.writeFileSync(LOCAL_KV_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing local KV fallback:', error);
  }
}

export async function getCache(key: string) {
  if (process.env.KV_REST_API_URL) {
    try {
      return await kv.get(key);
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  } else {
    // Local fallback
    const data = readLocalKV();
    return data[key] || null;
  }
}

export async function setCache(key: string, value: any) {
  if (process.env.KV_REST_API_URL) {
    try {
      await kv.set(key, value);
    } catch (error) {
      console.error('KV set error:', error);
    }
  } else {
    // Local fallback
    const data = readLocalKV();
    data[key] = value;
    writeLocalKV(data);
  }
}
