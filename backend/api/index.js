const express = require('express');
const verifyCaptcha = require('../external/recaptcha');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  res.send({ message: '/api -- working!' });
});

router.post('/getLink', async (req, res) => {
  const { token } = req.body;
  const captcha = await verifyCaptcha(token);

  if (!captcha.success) {
    return res.sendStatus(400);
  }

  // implement link generation
  return res.send({ status: 'OK' });
});

module.exports = router;
