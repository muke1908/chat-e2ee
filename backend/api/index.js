const express = require('express');
const verifyCaptcha = require('../external/recaptcha');

const router = express.Router({ mergeParams: true });

const chatController = require('./messaging');

router.get('/', async (req, res) => {
  res.send({ message: '/api -- working!' });
});

router.post('/getLink', async (req, res) => {
  const { token } = req.body;

  if (process.env.NODE_ENV === 'production') {
    const captcha = await verifyCaptcha(token);
    if (!captcha.success) {
      return res.sendStatus(400);
    }
  }

  // implement link generation
  return res.send({ status: 'OK' });
});

router.use('/chat', chatController);

module.exports = router;
