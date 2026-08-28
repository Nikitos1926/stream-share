import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/schemas/*.schema.ts', // explicit glob — excludes index.ts and any .js
  dialect: 'postgresql',
  // dbCredentials: {
  //   url: 'postgresql://postgres:postgres@localhost:5432/streamshare',
  // },
  dbCredentials: { url: process.env.DATABASE_URL! },
  // casing: 'snake_case',
});
