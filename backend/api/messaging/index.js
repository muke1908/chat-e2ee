const express = require('express');
const { publishMessage } = require('../../external/pubnub');
const uploadImage = require('../../external/imagebb');
const { insertInDb, findOneFromDB } = require('../../db');
const channelValid = require('../chatLink/utils/validateChannel');

const { PUBLIC_KEY_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

router.post('/message', async (req, res) => {
  const { message, sender, channel, image } = req.body;

  if (!message) {
    res.send(400);
  }
  const { valid } = await channelValid(channel);
  if (!valid) {
    return res.sendStatus(404);
  }

  let imageurl = null;

  if (image) {
    const data = image.substr(image.indexOf(',') + 1);

    try {
      const imageResponse = await uploadImage(data);
      imageurl = imageResponse.data.image.url;
    } catch (err) {
      return res.status(500).send({ message: 'failed to send image' });
    }
  }

  try {
    await publishMessage({ channel, sender, message, image: imageurl });
  } catch (err) {
    console.log(err);
  }
  return res.send({ message: 'message sent' });
});

router.post('/share-public-key', async (req, res) => {
  const { publicKey, sender, channel } = req.body;

  const { valid } = await channelValid(channel);
  if (!valid) {
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
