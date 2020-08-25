const express = require('express');
const { publishMessage } = require('../../external/pubnub');
const { insertInDb, findOneFromDB } = require('../../db');
const channelValid = require('../chatLink/utils/validateChannel');

const { PUBLIC_KEY_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

router.post('/message', async (req, res) => {
  const { message, sender, channel } = req.body;
  if (!message) {
    res.send(400);
  }
  const isChannelValid = await channelValid(channel);
  if (!isChannelValid) {
    return res.sendStatus(404);
  }

  try {
    await publishMessage({ channel, sender, message });
  } catch (err) {
    console.log(err);
  }
  return res.send({ message: 'message sent' });
});

router.post('/share-public-key', async (req, res) => {
  const { publicKey, sender, channel } = req.body;

  const isChannelValid = await channelValid(channel);
  if (!isChannelValid) {
    return res.sendStatus(404);
  }
  // TODO: do not store if already exists
  await insertInDb({ publicKey, sender, channel }, PUBLIC_KEY_COLLECTION);
  return res.send({ status: 'ok' });
});

router.get('/get-public-key', async (req, res) => {
  const { userId, channel } = req.query;

  const { valid } = await channelValid(channel);

  if (!valid) {
    return res.sendStatus(404);
  }

  const data = await findOneFromDB({ channel, sender: userId }, PUBLIC_KEY_COLLECTION);
  return res.send(data);
});

module.exports = router;
