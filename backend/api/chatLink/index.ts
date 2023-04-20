import express from "express";
import asyncHandler from "../../middleware/asyncHandler";
import generateLink, { LinkType } from "./utils/link";
import channelValid, { CHANNLE_STATE } from "./utils/validateChannel";

import db from "../../db";
import { LINK_COLLECTION } from "../../db/const";

const router = express.Router({ mergeParams: true });

const generateUniqueLink = async (): Promise<LinkType> => {
  const link = generateLink();

  // This ensures, PINs won't clash each other
  // Best case loop is not even executed
  // worst case, loop can take 2 or more iterations
  const pinExists = await db.findOneFromDB({ pin: link.pin }, LINK_COLLECTION);
  if (pinExists) {
    return generateUniqueLink();
  }
  return link;
};

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const link = await generateUniqueLink();
    await db.insertInDb(link, LINK_COLLECTION);
    return res.send(link);
  })
);
router.get(
  "/:pin",
  asyncHandler(async (req, res) => {
    const { pin } = req.params;
    if (!pin) {
      return res.sendStatus(404).send("Invalid pin");
    }
    const link = await db.findOneFromDB({ pin: pin.toUpperCase() }, LINK_COLLECTION);
    const currentTime = new Date().getTime();
    const invalidLink = !link || currentTime - link.pinCreatedAt > 30 * 60 * 1000;
    if (invalidLink) {
      return res.sendStatus(404).send("Invalid pin");
    }
    return res.send(link);
  })
);
router.get(
  "/status/:channel",
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404).send("Invalid channel");
    }

    return res.send({ status: "ok" });
  })
);
router.delete(
  "/:channel",
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { state } = await channelValid(channel);

    const invalidstates = [ CHANNLE_STATE.DELETED, CHANNLE_STATE.NOT_FOUND ];
    if (invalidstates.includes(state)) {
      return res.sendStatus(404).send("Invalid channel");
    }

    await db.updateOneFromDb({ hash: channel }, { deleted: true }, LINK_COLLECTION);
    return res.send({ status: "ok" });
  })
);

export default router;
