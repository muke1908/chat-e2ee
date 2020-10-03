const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const generateLink = require('./utils/link');
const channelValid = require('./utils/validateChannel');

const { insertInDb, updateOneFromDb, findOneFromDB } = require('../../db');
const { LINK_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

const generateUniqueLink = async () => {
  const link = generateLink();

  // This ensures, PINs won't clash each other
  // Best case loop is not even executed
  // worst case, loop can take 2 or more iterations
  const pinExists = await findOneFromDB({ pin: link.pin }, LINK_COLLECTION);
  if (pinExists) {
    return generateUniqueLink();
  }
  return link;
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const link = await generateUniqueLink();
    await insertInDb(link, LINK_COLLECTION);
    return res.send(link);
  })
);
router.get(
  '/:pin',
  asyncHandler(async (req, res) => {
    const { pin } = req.params;
    if (!pin) {
      return res.sendStatus(404).send('Invalid pin');
    }
    const link = await findOneFromDB({ pin: pin.toUpperCase() }, LINK_COLLECTION);
    const currentTime = new Date().getTime();
    const invalidLink = !link || currentTime - link.pinCreatedAt > 30 * 60 * 1000;
    if (invalidLink) {
      return res.sendStatus(404).send('Invalid pin');
    }
    return res.send(link);
  })
);
router.get(
  '/status/:channel',
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { valid } = await channelValid(channel);

    if (!valid) {
      return res.sendStatus(404).send('Invalid channel');
    }

    return res.send({ status: 'ok' });
  })
);
router.delete(
  '/:channel',
  asyncHandler(async (req, res) => {
    const { channel } = req.params;
    const { state } = await channelValid(channel);

    const invalidstates = ['DELETED', 'NOT_FOUND'];
    if (invalidstates.includes(state)) {
      return res.sendStatus(404).send('Invalid channel');
    }

    await updateOneFromDb({ hash: channel }, { deleted: true }, LINK_COLLECTION);
    return res.send({ status: 'ok' });
  })
);
module.exports = router;
