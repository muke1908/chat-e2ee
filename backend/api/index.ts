import express, { Request, Response } from 'express';

import chatLinkController from './chatLink';
import chatController from './messaging';

const router = express.Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  res.send({ message: "/api is working!" });
});

router.use("/chat", chatController);
router.use("/chat-link", chatLinkController);

export default router;
