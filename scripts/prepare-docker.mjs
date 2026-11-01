/**
 * Docker vfs copies every parent layer, which exceeds this machine's disk for
 * the official Postgres image. crane exports the verified official filesystem;
 * a local import stores it as one layer. Image metadata and provenance remain.
 * Other Docker storage drivers use the original image unchanged.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const image = "supabase/postgres:15.8.1.085";
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", ...options });
export function prepareDockerImage() {
  const driver = run("docker", ["info", "--format", "{{.Driver}}"]).trim();
  if (driver !== "vfs") return;
  try {
    run("docker", ["image", "inspect", image], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return;
  } catch {}
  const dir = path.resolve("supabase/.temp/flat-postgres");
  mkdirSync(dir, { recursive: true });
  const crane = path.join(dir, "crane");
  if (!existsSync(crane)) {
    const arch = { x64: "x86_64", arm64: "arm64" }[process.arch];
    if (process.platform !== "linux" || !arch)
      throw new Error("vfs 환경 helper는 Linux x64/ARM64만 지원합니다.");
    const asset = `go-containerregistry_Linux_${arch}.tar.gz`,
      base =
        "https://github.com/google/go-containerregistry/releases/download/v0.22.1/";
    for (const file of ["checksums.txt", asset])
      run("curl", [
        "--fail",
        "--location",
        "--silent",
        "--show-error",
        base + file,
        "--output",
        path.join(dir, file),
      ]);
    const expected = readFileSync(path.join(dir, "checksums.txt"), "utf8")
      .split("\n")
      .find((l) => l.endsWith(asset))
      ?.split(/\s+/)[0];
    if (
      !expected ||
      createHash("sha256")
        .update(readFileSync(path.join(dir, asset)))
        .digest("hex") !== expected
    )
      throw new Error("crane 공식 SHA256 검증 실패");
    run("tar", ["-xzf", path.join(dir, asset), "-C", dir, "crane"]);
  }
  const platform = process.arch === "arm64" ? "linux/arm64" : "linux/amd64";
  const ref = "registry-1.docker.io/" + image;
  const digest = run(crane, ["digest", "--platform", platform, ref]).trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest))
    throw new Error("잘못된 이미지 digest");
  const pinned = ref.split(":")[0] + "@" + digest;
  const fullConfig = JSON.parse(
    run(crane, ["config", "--platform", platform, pinned]),
  );
  const config = fullConfig.config;
  let retainedBase = false;
  try {
    const existing = JSON.parse(
      run("docker", ["image", "inspect", "jieum/postgres-rootfs:15"], {
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
    retainedBase =
      existing[0]?.Config?.Labels?.["dev.jieum.source-digest"] === digest;
  } catch {}
  const tar = path.join(dir, "rootfs.tar");
  if (!retainedBase) {
    console.error(
      "Docker vfs: 공식 이미지의 digest를 고정하고 파일시스템을 한 레이어로 준비합니다.",
    );
    const marker = path.join(dir, "prepared.json");
    const hash = () => run("sha256sum", [tar]).split(/\s+/)[0];
    let reusable = false;
    if (existsSync(marker) && existsSync(tar)) {
      const saved = JSON.parse(readFileSync(marker, "utf8"));
      reusable = saved.digest === digest && saved.sha256 === hash();
    }
    if (!reusable) {
      run(crane, ["export", "--platform", platform, pinned, tar], {
        stdio: "inherit",
      });
      const manifest = path.join(dir, "manifest.json");
      writeFileSync(
        manifest,
        run(crane, ["manifest", "--platform", platform, pinned]),
      );
      run(
        "python3",
        [
          path.resolve("scripts/materialize-image-links.py"),
          tar,
          manifest,
          crane,
          ref.split(":")[0],
        ],
        { stdio: "inherit" },
      );
      writeFileSync(marker, JSON.stringify({ digest, sha256: hash() }));
    }
    const args = ["import", "--platform", platform];
    for (const item of config.Env || []) {
      const i = item.indexOf("=");
      args.push(
        "--change",
        `ENV ${item.slice(0, i)}=${JSON.stringify(item.slice(i + 1))}`,
      );
    }
    for (const key of ["Entrypoint", "Cmd"])
      if (config[key]?.length)
        args.push(
          "--change",
          `${key.toUpperCase()} ${JSON.stringify(config[key])}`,
        );
    if (config.WorkingDir)
      args.push("--change", `WORKDIR ${config.WorkingDir}`);
    if (config.User) args.push("--change", `USER ${config.User}`);
    for (const port of Object.keys(config.ExposedPorts || {}))
      args.push("--change", `EXPOSE ${port}`);
    if (Object.keys(config.Volumes || {}).length)
      args.push(
        "--change",
        `VOLUME ${JSON.stringify(Object.keys(config.Volumes))}`,
      );
    for (const [key, value] of Object.entries(config.Labels || {}))
      args.push(
        "--change",
        `LABEL ${JSON.stringify(key)}=${JSON.stringify(value)}`,
      );
    args.push(
      "--change",
      `LABEL dev.jieum.source-digest=${digest}`,
      "--change",
      "LABEL dev.jieum.storage=verified-flat-vfs",
      tar,
      "jieum/postgres-rootfs:15",
    );
    run("docker", args, { stdio: "inherit" });
  }
  let file = "FROM jieum/postgres-rootfs:15\n";
  if (config.StopSignal) file += `STOPSIGNAL ${config.StopSignal}\n`;
  if (config.Healthcheck) {
    const h = config.Healthcheck;
    let opts = "";
    for (const [key, flag] of [
      ["Interval", "interval"],
      ["Timeout", "timeout"],
      ["StartPeriod", "start-period"],
    ])
      if (h[key]) opts += ` --${flag}=${h[key]}ns`;
    if (h.Retries) opts += ` --retries=${h.Retries}`;
    if (h.Test?.[0] === "NONE") file += "HEALTHCHECK NONE\n";
    else if (h.Test?.length)
      file += `HEALTHCHECK${opts} CMD ${h.Test[0] === "CMD-SHELL" ? h.Test.slice(1).join(" ") : JSON.stringify(h.Test.slice(1))}\n`;
  }
  writeFileSync(path.join(dir, "Dockerfile"), file);
  // Empty build context avoids sending the large tar or proxy material.
  const context = path.join(dir, "context");
  mkdirSync(context, { recursive: true });
  writeFileSync(path.join(context, "Dockerfile"), file);
  run("docker", ["build", "--network=none", "-t", image, context], {
    stdio: "inherit",
    env: {
      ...process.env,
      BUILDX_CONFIG: process.env.BUILDX_CONFIG || path.join(dir, "buildx"),
    },
  });
  if (existsSync(tar)) unlinkSync(tar);
  writeFileSync(
    path.join(dir, "provenance.json"),
    JSON.stringify(
      {
        source: ref,
        digest,
        platform,
        derivedImage: image,
        config: fullConfig,
      },
      null,
      2,
    ),
  );
  console.error("공식 이미지 파일시스템 검증 및 vfs 저장 최적화 완료.");
}
if (process.argv[1]?.endsWith("prepare-docker.mjs")) prepareDockerImage();
