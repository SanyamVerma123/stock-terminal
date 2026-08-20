import { spawnSync } from "node:child_process";

const build = spawnSync("pnpm", ["exec", "vite", "build"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    NITRO_PRESET: "vercel",
  },
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);
