import { prepareDockerImage } from "./prepare-docker.mjs";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const cliDir = path.join(root, "supabase/.temp/cli");
export const cli = path.join(
  cliDir,
  process.platform === "win32" ? "supabase.exe" : "supabase",
);
export function ensureCli() {
  if (existsSync(cli)) return;
  const os = { linux: "linux", darwin: "darwin" }[process.platform];
  const arch = { x64: "amd64", arm64: "arm64" }[process.arch];
  if (!os || !arch)
    throw new Error(
      "이 helper는 Linux/macOS x64/ARM64를 지원합니다. Windows는 Supabase 공식 CLI를 사용하세요.",
    );
  mkdirSync(cliDir, { recursive: true });
  const asset = `supabase_${os}_${arch}.tar.gz`,
    base = "https://github.com/supabase/cli/releases/download/v2.75.0/";
  for (const file of ["supabase_2.75.0_checksums.txt", asset])
    execFileSync(
      "curl",
      [
        "--fail",
        "--location",
        "--silent",
        "--show-error",
        base + file,
        "--output",
        path.join(cliDir, file),
      ],
      { stdio: "inherit" },
    );
  const expected = readFileSync(
    path.join(cliDir, "supabase_2.75.0_checksums.txt"),
    "utf8",
  )
    .split("\n")
    .find((l) => l.endsWith(asset))
    ?.split(/\s+/)[0];
  const actual = createHash("sha256")
    .update(readFileSync(path.join(cliDir, asset)))
    .digest("hex");
  if (!expected || actual !== expected)
    throw new Error("Supabase CLI 체크섬 검증 실패");
  execFileSync("tar", ["-xzf", path.join(cliDir, asset), "-C", cliDir]);
  console.error("공식 Supabase CLI SHA256 검증 완료.");
}
export function localStatus() {
  ensureCli();
  return JSON.parse(
    execFileSync(cli, ["status", "-o", "json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  ensureCli();
  if (process.argv[2] === "start") prepareDockerImage();
  const result = spawnSync(cli, process.argv.slice(2), {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      SUPABASE_INTERNAL_IMAGE_REGISTRY:
        process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY || "docker.io",
    },
  });
  process.exit(result.status ?? 1);
}
