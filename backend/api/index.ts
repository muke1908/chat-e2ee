const express = require("express");

const router = express.Router({ mergeParams: true });

import chatController from "./messaging";
import chatLinkController from "./chatLink";

router.get("/", async (req, res) => {
  res.send({ message: "/api is working!" });
});

router.use("/chat", chatController);
router.use("/chat-link", chatLinkController);

export default router;
