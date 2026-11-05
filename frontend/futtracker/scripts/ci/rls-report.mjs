// FUT-137 (DT-12): resumen del job de RLS en CI.
//
//   node scripts/ci/rls-report.mjs <reporte.json>
//
// Lee el reporte JSON de Vitest y falla si no corrió ningún test o si alguno
// quedó salteado. Es justo el problema que tenía el CI: sin base, los tests de
// RLS se saltean solos (`describe.skipIf(!IS_LOCAL)`) y el check queda en verde
// sin haber probado nada. Si falla un test, el paso de Vitest ya falló antes;
// esto cubre el caso silencioso.
//
// Escribe el resumen en la pestaña Summary del job ($GITHUB_STEP_SUMMARY).
import { appendFileSync, readFileSync } from "node:fs";

const path = process.argv[2];

if (!path) {
  console.error("Uso: node scripts/ci/rls-report.mjs <reporte.json>");
  process.exit(2);
}

const report = JSON.parse(readFileSync(path, "utf8"));
const total = report.numTotalTests ?? 0;
const passed = report.numPassedTests ?? 0;
const failed = report.numFailedTests ?? 0;
const skipped = (report.numPendingTests ?? 0) + (report.numTodoTests ?? 0);
const files = report.testResults?.length ?? 0;
// Un archivo que tira antes de correr sus tests (un import roto, un error en
// el cuerpo de un `describe`) no suma tests fallados: falla el archivo entero.
const brokenFiles = (report.testResults ?? []).filter(
  (file) => file.status === "failed" && !file.assertionResults?.length,
);

const ok = total > 0 && skipped === 0 && failed === 0 && brokenFiles.length === 0;
const line =
  `${passed} de ${total} tests de RLS pasaron en ${files} archivos ` +
  `(${failed} fallaron, ${skipped} salteados, ${brokenFiles.length} archivos sin correr).`;

console.log(line);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Tests de RLS\n\n${ok ? "✅" : "❌"} ${line}\n`,
  );
}

if (total === 0) {
  console.error("No corrió ningún test de RLS: ¿la base local no levantó?");
}

for (const file of brokenFiles) {
  console.error(`No corrió ningún test de ${file.name}: ${file.message ?? "falló al cargar"}`);
}

if (skipped > 0) {
  console.error(
    "Hay tests salteados: con la base levantada no se tiene que saltear ninguno. " +
      "Revisar que NEXT_PUBLIC_SUPABASE_URL apunte a 127.0.0.1.",
  );
}

process.exit(ok ? 0 : 1);
