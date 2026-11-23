require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Exact host allowlist. Keep this empty until you have a creator-authorized
// direct-download host. Do not use broad wildcards or user-submitted hosts.
const allowedHosts = new Set(
  (process.env.ALLOWED_DOWNLOAD_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ClipNest", integrationsConfigured: allowedHosts.size > 0 });
});

app.post("/api/validate-link", apiLimiter, (req, res) => {
  const rawUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";

  if (!rawUrl || rawUrl.length > 2048) {
    return res.status(400).json({ error: "Enter a valid media URL." });
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "That URL is not valid." });
  }

  if (parsed.protocol !== "https:") {
    return res.status(400).json({ error: "For safety, only HTTPS download links are accepted." });
  }

  if (parsed.username || parsed.password || parsed.port) {
    return res.status(400).json({ error: "Links containing credentials or custom ports are not accepted." });
  }

  const host = parsed.hostname.toLowerCase();
  if (!allowedHosts.has(host)) {
    return res.status(403).json({
      error: "This source is not enabled yet. ClipNest only accepts direct-download hosts that have been reviewed and explicitly allowed by the site owner."
    });
  }

  // The server does not fetch, proxy, scrape, or download the URL.
  // It only confirms that its hostname is on the exact configured allowlist.
  return res.json({
    ok: true,
    message: "Source host accepted. Confirm you have permission to save this file.",
    destination: parsed.toString()
  });
});

app.use((err, _req, res, _next) => {
  console.error("Request error:", err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ClipNest listening on port ${PORT}`);
});
