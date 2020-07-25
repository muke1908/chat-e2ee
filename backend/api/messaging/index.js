const express = require('express');
const { publishMessage } = require('../../external/pubnub');
const { insertInDb, findOneFromDB } = require('../../db');
const { PUBLIC_KEY_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

router.post('/send', async (req, res) => {
  const { message, sender, channel } = req.body;

  // TODO:  validate the channel
  try {
    await publishMessage({ channel, sender, message });
  } catch (err) {
    console.log(err);
  }
  return res.send({ message: 'message sent' });
});

router.post('/updatePublicKey', async (req, res) => {
  const { publicKey, sender, channel } = req.body;
  // TODO: do not store if already exists
  await insertInDb({ publicKey, sender, channel }, PUBLIC_KEY_COLLECTION);
  res.send({ status: 'ok' });
});

router.get('/getPublicKey', async (req, res) => {
  const { userId, channel } = req.query;

  const data = await findOneFromDB({ channel, sender: userId }, PUBLIC_KEY_COLLECTION);
  res.send(data);
});

module.exports = router;
