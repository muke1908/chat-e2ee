import express, { Request, Response } from "express";
import uploadImage from "../../external/uploadImage";
import db from "../../db";
import channelValid from "../chatLink/utils/validateChannel";
import { socketEmit, SOCKET_TOPIC } from "../../socket.io";
import getClientInstance from "../../socket.io/clients";
import asyncHandler from "../../middleware/asyncHandler";

import { PUBLIC_KEY_COLLECTION } from "../../db/const";
import { ChatMessageType, GetPublicKeyResponse, MessageResponse, SharePublicKeyResponse, UsersInChannelResponse } from "./types";

const router = express.Router({ mergeParams: true });
const clients = getClientInstance();

router.post(
  "/message",
  asyncHandler(async (req: Request, res: Response): Promise<Response<MessageResponse>> => {
    const { message, sender, channel, image } = req.body;

    if (!message) {
      return res.send(400);
    }
    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404);
    }
    const usersInChannel = clients.getClientsByChannel(channel);
    const usersInChannelArr = Object.keys(usersInChannel);
    const ifSenderIsInChannel = usersInChannelArr.find((u) => u === sender);

    if (!ifSenderIsInChannel) {
      console.error('Sender is not in channel');
      return res.status(401).send({ error: "Permission denied" });
    }

    const receiver = usersInChannelArr.find((u) => u !== sender);
    if(!receiver) {
      console.error('No receiver is in the channel');
      return;
    }

    const id = new Date().valueOf();
    const timestamp = new Date().valueOf();
    const dataToPublish: ChatMessageType = {
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
    const receiverSid = usersInChannel[receiver].sid;
    socketEmit<SOCKET_TOPIC.CHAT_MESSAGE>(SOCKET_TOPIC.CHAT_MESSAGE, receiverSid, dataToPublish);
    return res.send({ message: "message sent", id, timestamp });
  })
);

router.post(
  "/share-public-key",
  asyncHandler(async (req: Request, res: Response): Promise<Response<SharePublicKeyResponse>> => {
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
  asyncHandler(async (req: Request, res: Response): Promise<Response<GetPublicKeyResponse>> => {
    const { userId, channel } = req.query;

    const { valid } = await channelValid(channel as string);

    if (!valid) {
      return res.sendStatus(404);
    }

    const data = await db.findOneFromDB<GetPublicKeyResponse>({ channel, sender: userId }, PUBLIC_KEY_COLLECTION);
    return res.send(data);
  })
);

router.get(
  "/get-users-in-channel",
  asyncHandler(async (req: Request, res: Response): Promise<Response<UsersInChannelResponse>> => {
    const { channel } = req.query;

    const { valid } = await channelValid(channel as string);

    if (!valid) {
      return res.sendStatus(404);
    }

    const data = clients.getClientsByChannel(channel as string);
    const usersInChannel = data ? Object.keys(data).map((userId) => ({ uuid: userId })) : [];
    return res.send(usersInChannel);
  })
);

export default router;
