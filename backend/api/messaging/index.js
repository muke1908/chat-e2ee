const express = require('express');
const { publishMessage } = require('../../external/pubnub');

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

module.exports = router;
