#!/usr/bin/env node
/**
 * Дропает volume с БД, поднимает контейнер заново и синхронизирует
 * схему через drizzle-kit push. Кроссплатформенно (Win/macOS/Linux),
 * т.к. использует только Node.js + docker compose CLI.
 *
 * Запуск: node scripts/reset-db.mjs
 * Пропустить подтверждение: node scripts/reset-db.mjs --yes
 */

import { spawn } from "node:child_process";
import readline from "node:readline";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Путь к папке с docker-compose.yml. Переопределить явно: COMPOSE_DIR=some/path
// Если не задано — пробуем несколько вероятных мест по очереди и берём первое,
// которое реально существует (не полагаемся на то, где лежит сам скрипт).
function resolveComposeDir() {
  if (process.env.COMPOSE_DIR) {
    return path.resolve(process.cwd(), process.env.COMPOSE_DIR);
  }
  const candidates = [
    path.resolve(__dirname, "infra"),       // скрипт в корне репо, infra/ рядом
    path.resolve(__dirname, "..", "infra"), // скрипт в scripts/, infra/ в корне репо
    path.resolve(process.cwd(), "infra"),   // infra/ рядом с cwd на момент запуска
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, "docker-compose.yml")));
  if (found) return found;

  console.error("Не нашёл docker-compose.yml. Проверил:");
  for (const c of candidates) console.error(`  - ${c}`);
  console.error("Укажи путь явно: COMPOSE_DIR=infra pnpm db:reset");
  process.exit(1);
}

const COMPOSE_DIR = resolveComposeDir();

const DB_SERVICE = process.env.DB_SERVICE ?? "postgres";
const POSTGRES_USER = process.env.POSTGRES_USER ?? "postgres";
const SKIP_CONFIRM = process.argv.includes("--yes") || process.argv.includes("-y");

// shell нужен только на Windows, чтобы находить .cmd-шимы (pnpm и т.п.).
// На Unix docker/pnpm — обычные бинарники в PATH, shell не требуется,
// это заодно убирает deprecation warning про экранирование аргументов.
const needsShell = process.platform === "win32";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: needsShell,
      cwd: COMPOSE_DIR,
      ...opts,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} завершился с кодом ${code}`));
    });
    child.on("error", reject);
  });
}

function runQuiet(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "ignore", shell: needsShell, cwd: COMPOSE_DIR });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`→ Использую docker-compose.yml из: ${COMPOSE_DIR}`);

  if (!SKIP_CONFIRM) {
    const answer = await ask("⚠️  Это удалит volume базы данных и ВСЕ данные в ней. Продолжить? [y/N] ");
    if (answer !== "y" && answer !== "yes") {
      console.log("Отменено.");
      process.exit(1);
    }
  }

  console.log("→ Останавливаю контейнеры и удаляю volume...");
  await run("docker", ["compose", "down", "-v"]);

  console.log("→ Поднимаю контейнеры заново...");
  await run("docker", ["compose", "up", "-d"]);

  console.log("→ Жду, пока Postgres станет готов...");
  let ready = false;
  for (let i = 1; i <= 30; i++) {
    ready = await runQuiet("docker", [
      "compose", "exec", "-T", DB_SERVICE,
      "pg_isready", "-U", POSTGRES_USER,
    ]);
    if (ready) {
      console.log("  Postgres готов.");
      break;
    }
    await sleep(1000);
  }
  if (!ready) {
    console.error("  Не дождался готовности Postgres за 30 попыток. Прерываюсь.");
    process.exit(1);
  }

  console.log("→ Синхронизирую схему через drizzle-kit push...");
  // drizzle-kit и drizzle.config.ts живут в packages/db, а не в корне монорепо —
  // фильтруем pnpm по пути пакета (надёжнее, чем по полю "name" из package.json).
  // Переопределить: DB_PACKAGE_PATH=packages/db (относительно корня, где запущен pnpm db:reset)
  const DB_PACKAGE_PATH = process.env.DB_PACKAGE_PATH ?? "./packages/db";
  await run("pnpm", ["--filter", DB_PACKAGE_PATH, "exec", "drizzle-kit", "push"], {
    cwd: process.cwd(),
  });

  console.log("✅ Готово.");
}

main().catch((err) => {
  console.error("Ошибка:", err.message);
  process.exit(1);
});
