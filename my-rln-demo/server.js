const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Set headers for cross-origin isolation
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, "build")));

// For any route, send index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
