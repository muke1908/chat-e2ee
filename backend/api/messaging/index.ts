import express from "express";
import uploadImage from "../../external/uploadImage";
import db from "../../db";
import channelValid from "../chatLink/utils/validateChannel";
import { socketEmit } from "../../socket.io";
import Clients from "../../socket.io/clients";
import asyncHandler from "../../middleware/asyncHandler";

import { PUBLIC_KEY_COLLECTION } from "../../db/const";

const router = express.Router({ mergeParams: true });
const clients = new Clients();
router.post(
  "/message",
  asyncHandler(async (req, res) => {
    const { message, sender, channel, image } = req.body;

    if (!message) {
      return res.send(400);
    }
    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404);
    }
    const usersInChannel = Object.keys(clients.getClientsByChannel(channel) || {});
    const ifSenderIsInChannel = usersInChannel.find((u) => u === sender);

    if (!ifSenderIsInChannel) {
      return res.status(401).send({ error: "Limit reached" });
    }
    const id = new Date().valueOf();
    const timestamp = new Date().valueOf();
    const dataToPublish: any = {
      channel,
      sender,
      message,
      id,
      timestamp
    };

    if (image) {
      const { imageurl } = await uploadImage(image);
      dataToPublish.image = imageurl;
    }

    const { sid } = clients.getReceiverByChannel(channel, sender);
    socketEmit("chat-message", sid, dataToPublish);

    return res.send({ message: "message sent", id, timestamp });
  })
);

router.post(
  "/share-public-key",
  asyncHandler(async (req, res) => {
    const { publicKey, sender, channel } = req.body;

    const { valid } = await channelValid(channel);
    if (!valid) {
      return res.sendStatus(404);
    }
    // TODO: do not store if already exists
    await db.insertInDb({ publicKey, sender, channel }, PUBLIC_KEY_COLLECTION);
    return res.send({ status: "ok" });
  })
);

router.get(
  "/get-public-key",
  asyncHandler(async (req, res) => {
    const { userId, channel } = req.query;

    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404);
    }

    const data = await db.findOneFromDB({ channel, sender: userId }, PUBLIC_KEY_COLLECTION);
    return res.send(data);
  })
);

router.get(
  "/get-users-in-channel",
  asyncHandler(async (req, res) => {
    const { channel } = req.query;

    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404);
    }

    const data = clients.getClientsByChannel(channel);
    const usersInChannel = data ? Object.keys(data).map((userId) => ({ uuid: userId })) : [];
    return res.send(usersInChannel);
  })
);

export default router;
