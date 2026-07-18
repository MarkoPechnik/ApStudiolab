import app from "./src/server/app";
import { createServer as createViteServer } from "vite";
import express from "express";
import path from "path";

async function startServer() {
  const PORT = 3000;

  // Serve static assets / handle Vite in dev/prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`full-stack server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Server execution failed:", e);
});
