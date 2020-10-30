const express = require('express');

const router = express.Router({ mergeParams: true });

const chatController = require('./messaging');
const chatLinkController = require('./chatLink');

router.get('/', async (req, res) => {
  res.send({ message: '/api is working!' });
});

router.use('/chat', chatController);
router.use('/chat-link', chatLinkController);

module.exports = router;
