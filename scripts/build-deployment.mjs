import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const build = spawnSync("pnpm", ["exec", "vite", "build"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    LOVABLE_SANDBOX: "1",
    LOVABLE_NITRO_PRESET: "lovable-fetch-bundle",
  },
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);

await rm("dist/public", { recursive: true, force: true });
await mkdir("dist/public", { recursive: true });
await cp("dist/client", "dist/public", { recursive: true });

const entry = `import { createServer } from "node:http";
import { Readable } from "node:stream";
import app from "./server/index.mjs";

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

function requestHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method || "GET";
    const request = new Request(new URL(req.url || "/", \`http://\${req.headers.host || "localhost"}\`), {
      method,
      headers: requestHeaders(req.headers),
      body: method === "GET" || method === "HEAD" ? undefined : Readable.toWeb(req),
      duplex: "half",
    });
    const response = await app.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch (error) {
    console.error("[runtime] request failed", error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => console.log(\`Listening on http://\${host}:\${port}\`));
`;

await writeFile("dist/index.js", entry, "utf8");
