import express, { Request, Response } from 'express';

import chatLinkController from './chatLink';
import chatController from './messaging';
import sessionController from './call/session';

const router = express.Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  res.send({ message: "/api is working!" });
});

router.use("/chat", chatController);
router.use("/chat-link", chatLinkController);
router.use("/session", sessionController);

export default router;
