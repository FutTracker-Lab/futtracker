#!/usr/bin/env node
// Chequea que las claves de messages/es-AR.json coincidan exactamente con
// las que el código realmente usa. Falla si hay claves usadas y no
// definidas, o definidas y no usadas (FUT-82, requisito 7).
//
// Deliberadamente no depende de una librería: es un chequeo chico y estable
// (dos formas de llamar a next-intl: useTranslations/getTranslations con
// namespace + t("clave"), o t("namespace.clave")).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MESSAGES_PATH = join(ROOT, "messages", "es-AR.json");
const SCAN_DIRS = ["app", "components", "lib"];

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
      walk(full, files);
    } else if ([".ts", ".tsx"].includes(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

function findUsedKeys(files) {
  // Matchea useTranslations("ns") / getTranslations("ns") seguido, en
  // cualquier punto posterior del archivo, de t("clave"). Aproximado pero
  // suficiente para un catálogo chico: cruza namespace de la llamada más
  // cercana con cada t(...) del archivo.
  const used = new Set();
  const namespaceCallRe = /(?:useTranslations|getTranslations)\(\s*["'`]([\w.-]+)["'`]\s*\)/g;
  const tCallRe = /\bt\(\s*["'`]([\w.-]+)["'`]/g;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const namespaces = [...content.matchAll(namespaceCallRe)].map((m) => m[1]);
    const namespace = namespaces[0]; // un solo namespace por archivo, en este proyecto
    for (const match of content.matchAll(tCallRe)) {
      const key = match[1];
      used.add(namespace ? `${namespace}.${key}` : key);
    }
  }
  return used;
}

const messages = JSON.parse(readFileSync(MESSAGES_PATH, "utf8"));
const definedKeys = new Set(flattenKeys(messages));
const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
const usedKeys = findUsedKeys(files);

const missing = [...usedKeys].filter((k) => !definedKeys.has(k));
const unused = [...definedKeys].filter((k) => !usedKeys.has(k));

if (missing.length > 0) {
  console.error("Claves usadas en el código pero no definidas en es-AR.json:");
  missing.forEach((k) => console.error(`  - ${k}`));
}
if (unused.length > 0) {
  console.error("Claves definidas en es-AR.json pero no usadas en el código:");
  unused.forEach((k) => console.error(`  - ${k}`));
}

if (missing.length > 0 || unused.length > 0) {
  process.exit(1);
}

console.log(`i18n:check OK — ${definedKeys.size} claves, todas usadas y definidas.`);
