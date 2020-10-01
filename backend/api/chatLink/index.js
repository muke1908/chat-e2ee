const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const generateLink = require('./utils/link');
const channelValid = require('./utils/validateChannel');

const { insertInDb, updateOneFromDb, findOneFromDB } = require('../../db');
const { LINK_COLLECTION } = require('../../db/const');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  asyncHandler(async (req, res) => {

    let link = generateLink();
    //This ensures, PINs won't clash each other
    //Best case loop is not even executed
    //worst case, loop can take 2 or more iterations
    while(await findOneFromDB({pin : link.pin}, LINK_COLLECTION)) {
      link = generateLink()
    }
    await insertInDb(link, LINK_COLLECTION);
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
