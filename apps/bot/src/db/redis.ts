import 'dotenv/config';
import Redis from 'ioredis';

const url = process.env.REDIS_URL;
if (!url) throw new Error('REDIS_URL is missing');

export const redis = new Redis(url);

redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (e) => console.error('[redis] error', e));
