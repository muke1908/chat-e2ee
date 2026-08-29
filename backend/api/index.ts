import express, { Request, Response } from 'express';

import chatHashController from './chatHash';
import chatController from './messaging';

const router = express.Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  res.send({ message: "/api is working!" });
});

router.use("/chat", chatController);
router.use("/chat-link", chatHashController);

export default router;
