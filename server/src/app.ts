import fs from "node:fs";
import path from "node:path";
import express, { type ErrorRequestHandler } from "express";
import type { Db } from "./db.js";
import { parseFilters, parseUserQuery, QueryError } from "./query.js";
import { getFacets, listUsers } from "./users.js";

export const createApp = (db: Db, options: { staticDir?: string } = {}) => {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/users", (req, res) => {
    res.json(listUsers(db, parseUserQuery(req.query)));
  });

  app.get("/api/users/facets", (req, res) => {
    res.json(getFacets(db, parseFilters(req.query)));
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  if (options.staticDir && fs.existsSync(options.staticDir)) {
    const staticDir = options.staticDir;
    app.use(express.static(staticDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof QueryError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  };
  app.use(onError);

  return app;
};
