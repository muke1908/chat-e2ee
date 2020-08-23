const express = require('express');
const verifyCaptcha = require('../../external/recaptcha');
const asyncHandler = require('../../middleware/asyncHandler');
const generateLink = require('./utils/link');
const channelValid = require('./utils/validateChannel');

const { insertInDb } = require('../../db');
const { LINK_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

router.post(
  '/generate',
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
  '/validate/:channel',
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404).send('Invalid channel');
    }

    return res.send({ status: 'ok' });
  })
);

module.exports = router;
