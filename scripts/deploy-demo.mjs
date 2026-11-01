import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Vercel's anonymous deployment builds locally before a URL is allocated.
// Export committed source, rather than exposing .env.local or local build traces.
// This is a generated deployment artifact, not another Git checkout/worktree.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
if (git(["status", "--porcelain"]))
  throw new Error("먼저 배포할 변경 사항을 커밋해 주세요.");
const files = git(["ls-files", "-z"]).split("\0");
if (
  files.some(
    (file) =>
      path.basename(file).startsWith(".env") &&
      path.basename(file) !== ".env.example",
  )
)
  throw new Error("환경 값이 담긴 파일은 배포 소스에 포함할 수 없습니다.");
const commit = git(["rev-parse", "HEAD"]);
const source = mkdtempSync(path.join(tmpdir(), "ji-eum-demo-"));
const archive = execFileSync("git", ["archive", "--format=tar", commit], {
  cwd: root,
  maxBuffer: 32 * 1024 * 1024,
});
execFileSync("tar", ["-xf", "-", "-C", source], { input: archive });
const env = {
  ...process.env,
  JI_EUM_DATA_MODE: "demo",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "",
};
const cache =
  process.env.NPM_CONFIG_CACHE ||
  path.join(tmpdir(), "ji-eum-deploy-npm-cache");
const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "--cache",
    cache,
    "exec",
    "--yes",
    "--package",
    "vercel@65.9.0",
    "--",
    "vercel",
    "deploy",
    ...process.argv.slice(2),
  ],
  { env: { ...env, NPM_CONFIG_CACHE: cache }, cwd: source, stdio: "inherit" },
);
if (result.error) {
  console.error("Vercel CLI를 실행하지 못했습니다:", result.error.message);
}
process.exit(result.status ?? 1);
