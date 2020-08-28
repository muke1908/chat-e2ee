const express = require('express');
// const { publishMessage } = require('../../external/pubnub');
const uploadImage = require('../../external/imagebb');
const { insertInDb, findOneFromDB } = require('../../db');
const channelValid = require('../chatLink/utils/validateChannel');
const { socketEmit } = require('../../socket.io');
const clients = require('../../socket.io/clients');
const asyncHandler = require('../../middleware/asyncHandler');

const { PUBLIC_KEY_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

router.post(
  '/message',
  asyncHandler(async (req, res) => {
    const { message, sender, channel, image } = req.body;

    if (!message) {
      res.send(400);
    }
    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404);
    }

    const dataToPublish = {
      channel,
      sender,
      message
    };

    if (image) {
      const { imageurl } = await uploadImage(image);
      dataToPublish.image = imageurl;
    }

    // await publishMessage(dataToPublish);
    // send to internal socket server
    const { sid } = clients.getReceiverByChannel(channel, sender);
    socketEmit('chat-message', sid, dataToPublish);

    return res.send({ message: 'message sent' });
  })
);

router.post(
  '/share-public-key',
  asyncHandler(async (req, res) => {
    const { publicKey, sender, channel } = req.body;

    const { valid } = await channelValid(channel);
    if (!valid) {
      return res.sendStatus(404);
    }
    // TODO: do not store if already exists
    await insertInDb({ publicKey, sender, channel }, PUBLIC_KEY_COLLECTION);
    return res.send({ status: 'ok' });
  })
);

router.get(
  '/get-public-key',
  asyncHandler(async (req, res) => {
    const { userId, channel } = req.query;

    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404);
    }

    const data = await findOneFromDB({ channel, sender: userId }, PUBLIC_KEY_COLLECTION);
    return res.send(data);
  })
);

router.get(
  '/get-users-in-channel',
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

module.exports = router;
