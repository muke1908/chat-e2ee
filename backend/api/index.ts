import express, { Request, Response } from 'express';

const router = express.Router({ mergeParams: true });

import chatController from "./messaging";
import chatLinkController from "./chatLink";

router.get("/", async (req: Request, res: Response) => {
  res.send({ message: "/api is working!" });
});

router.use("/chat", chatController);
router.use("/chat-link", chatLinkController);

export default router;
