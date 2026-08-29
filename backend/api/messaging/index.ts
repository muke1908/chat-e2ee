import express, { Request, Response } from 'express';

import asyncHandler from '../../middleware/asyncHandler';
import getClientInstance from '../../socket.io/clients';
import channelValid from '../chatHash/utils/validateChannel';
import { UsersInChannelResponse } from './types';

const router = express.Router({ mergeParams: true });
const clients = getClientInstance();

router.get(
  "/get-users-in-channel",
  asyncHandler(async (req: Request, res: Response): Promise<Response<UsersInChannelResponse>> => {
    const { channel } = req.query;

    const { valid } = await channelValid(channel as string);

    if (!valid) {
      return res.sendStatus(404);
    }

    const data = clients.getClientsByChannel(channel as string);
    const usersInChannel = data ? Object.keys(data).map((userId) => ({ uuid: userId })) : [];
    return res.send(usersInChannel);
  })
);

export default router;
