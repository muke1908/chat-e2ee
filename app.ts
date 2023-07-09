import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';

import apiController from './backend/api';

require("dotenv").config();

const app = express();
app.disable("x-powered-by");
const corsOptions = {
  origin: process.env.CHAT_LINK_DOMAIN || "localhost:3001"
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10mb" }));

// add routes
app.use("/api", apiController);

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
} else {
  app.get("/*", (req, res) => {
    res.status(500).send("Cant serve production build in dev mode, please open react dev server");
  });
}

export default app;
