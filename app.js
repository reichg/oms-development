const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");

const OutputGenerator = require("./OutputGenerator");

app.use(express.json({ type: "text/plain" }));

app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to OMS Review",
  });
});

app.post("/", async (req, res, next) => {
  try {
    const { issues } = JSON.parse(JSON.stringify(req.body));

    await OutputGenerator.initiateProcessing(issues);

    res.status(200).json({
      status: "success",
      message: `Processed ${OutputGenerator.outputText.length} issue(s).`,
      links: OutputGenerator.links,
      output: OutputGenerator.outputText,
    });
  } catch (e) {
    res.status(200).json({
      status: "failed",
      message: `Failed to process the issues.`,
      output: `${e.message}`,
    });
  }
});

app.listen(port, () => console.log(`Listening to port: ${port}`));
