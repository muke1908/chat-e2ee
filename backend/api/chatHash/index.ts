import express from 'express';

import db from '../../db';
import { LINK_COLLECTION } from '../../db/const';
import asyncHandler from '../../middleware/asyncHandler';
import { LinkType } from './utils/link';
import channelValid, { CHANNEL_STATE } from './utils/validateChannel';
import generateHash from './utils/link';

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const link = generateHash();
    await db.insertInDb(link, LINK_COLLECTION);
    return res.send(link);
  })
);
router.get(
  "/status/:channel",
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { valid, state } = await channelValid(channel);

    if (!valid) {
      if (state === CHANNEL_STATE.DELETED) {
        return res.status(410).send({ error: "Channel deleted", state });
      }
      return res.status(404).send({ error: "Invalid channel", state });
    }

    return res.send({ status: "ok", state });
  })
);
router.delete(
  "/:channel",
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { state } = await channelValid(channel);

    const invalidstates = [ CHANNEL_STATE.DELETED, CHANNEL_STATE.NOT_FOUND ];
    if (invalidstates.includes(state)) {
      return res.sendStatus(404).send("Invalid channel");
    }

    await db.updateOneFromDb({ hash: channel }, { deleted: true }, LINK_COLLECTION);
    return res.send({ status: "ok" });
  })
);

export default router;
