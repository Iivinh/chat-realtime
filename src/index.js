const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Hello from Dockerized Node.js!"));
app.get("/healthz", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
// app.listen(port, () => console.log("API listening on " + port));
app.listen(port, "0.0.0.0", () => console.log("API listening on " + port));
