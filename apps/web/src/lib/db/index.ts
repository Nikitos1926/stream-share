import { createDb } from '@stream-share/db';

export const db = createDb(process.env.DATABASE_URL!);
