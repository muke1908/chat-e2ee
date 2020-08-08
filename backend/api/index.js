const express = require('express');
const verifyCaptcha = require('../external/recaptcha');
const asyncHandler = require('../middleware/asyncHandler');
const generateLink = require('../utils/link');
const { insertInDb } = require('../db');
const { LINK_COLLECTION } = require('../db/const');
const channelValid = require('./messaging/validateChannel');

const router = express.Router({ mergeParams: true });

const chatController = require('./messaging');

router.get('/', async (req, res) => {
  res.send({ message: '/api -- working!' });
});

router.post(
  '/getLink',
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (process.env.NODE_ENV === 'production') {
      if (!token) {
        return res.sendStatus(400);
      }

      const captcha = await verifyCaptcha(token);
      if (!captcha.success) {
        return res.sendStatus(400);
      }
    }

    const link = generateLink();
    await insertInDb(link, LINK_COLLECTION);
    return res.send(link);
  })
);

router.get(
  '/validateLink/:channel',
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const isChannelValid = await channelValid(channel);

    if (!isChannelValid) {
      return res.sendStatus(404).send('Invalid channel');
    }

    return res.send({ status: 'ok' });
  })
);

router.use('/chat', chatController);

module.exports = router;
