const express = require("express");
const app = express();

const port = process.env.PORT || 3000;

const OutputGenerator = require("./OutputGenerator");

app.use((req, _, next) => {
  req.requestRecievedAt = Date.now();
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: `Response took ${Date.now() - req.requestRecievedAt} ms`,
  });
});

app.get("/:issues", (req, res) => {
  const { issues } = req.params;

  OutputGenerator.initiateProcessing(issues);

  res.status(200).json({
    status: "success",
    message: `Issues received and procesing took ${
      Date.now() - req.requestRecievedAt
    } ms`,
    links: OutputGenerator.links,
    output: OutputGenerator.outputText,
  });
});

app.listen(port, () => console.log(`Listening to port: ${port}`));
