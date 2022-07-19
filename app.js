const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use((req, _, next) => {
  req.requestRecievedAt = Date.now();
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: `Response took ${Date.now() - req.requestRecievedAt}ms`,
  });
});

app.get("/:issues", (req, res) => {
  const issues = req.params.issues
    .split(",")
    .map((item) => `https://www.openstreetmap.org/${item.replace("-", "/")}`);

  res.status(200).json({
    status: "success",
    message: `Issues received and procesing took ${
      Date.now() - req.requestRecievedAt
    }ms`,
    issues,
  });
});

app.listen(port, () => console.log(`Listening to port: ${port}`));
