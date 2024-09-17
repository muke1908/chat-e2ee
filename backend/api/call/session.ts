import express, { Request, Response } from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { WebrtcSessionResponse } from '../messaging/types';
import channelValid from '../chatLink/utils/validateChannel';
import getClientInstance from '../../socket.io/clients';
import { SOCKET_TOPIC, socketEmit } from '../../socket.io';
const router = express.Router({ mergeParams: true });

const clients = getClientInstance();

router.post(
    "/",
    asyncHandler(async (req: Request, res: Response): Promise<Response<WebrtcSessionResponse>> => {
      const { description, sender, channel } = req.body;
  
      if (!description) {
        return res.send(400);
      }

      const { valid } = await channelValid(channel);
  
      if (!valid) {
        return res.sendStatus(404);
      }
      const usersInChannel = clients.getClientsByChannel(channel);
      const usersInChannelArr = Object.keys(usersInChannel);
      const ifSenderIsInChannel = usersInChannelArr.find((u) => u === sender);
  
      if (!ifSenderIsInChannel) {
        console.error('Sender is not in channel');
        return res.status(401).send({ error: "Permission denied" });
      }
  
      const receiver = usersInChannelArr.find((u) => u !== sender);
      if(!receiver) {
        console.error('No receiver is in the channel');
        return res.status(406).send({ error: "No user available to accept offer" });
      }
  
      const receiverSid = usersInChannel[receiver].sid;
      socketEmit<SOCKET_TOPIC.WEBRTC_SESSION_DESCRIPTION>(SOCKET_TOPIC.WEBRTC_SESSION_DESCRIPTION, receiverSid, description);
      return res.send({ status: "ok" });
    })
  );
  
  export default router;