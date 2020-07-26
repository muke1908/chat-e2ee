import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  pubnubInit,
  getUsersInChannel,
  fetchMessages,
  getUserSessionID,
  createUserSessionID,
  storeUserSessionID,
  getKeyPair,
  createKeyPair,
  storeKeyPair,
  typedArrayToStr,
  strToTypedArr
} from './helpers';

import { sendMessage, sharePublicKey, getPublicKey } from '../../service';
import styles from './Style.module.css';

// create your key at https://www.pubnub.com/
const subscribeKey = process.env.REACT_APP_PUBNUB_SUB_KEY;

const Chat = () => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [usersInChannel, setUsers] = useState([]);
  const [keyPair, setKeyPair] = useState(null);
  const [receiverPublicKey, setReceiverPublicKey] = useState(null);

  const { channelID } = useParams();
  let userId = getUserSessionID(channelID);

  // if not in session, lets create one and store.
  if (!userId) {
    userId = createUserSessionID(channelID);
    storeUserSessionID(channelID, userId);
  }

  const pubnub = pubnubInit({ subscribeKey, userId, channelID });

  const exchangePublicKey = (channelID) => {
    console.log('%cExchanging public key.', 'color:red; font-size:16px');

    let _keyPair = getKeyPair(channelID);
    if (!_keyPair) {
      _keyPair = createKeyPair();

      storeKeyPair(channelID, _keyPair);

      sharePublicKey({
        channel: channelID,
        publicKey: typedArrayToStr(_keyPair.publicKey),
        sender: userId
      });
    }

    setKeyPair(_keyPair);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    sendMessage({ channelID, userId, text });
    setText('');
  };

  const getSetUsers = async (channelID) => {
    const usersInChannel = await getUsersInChannel(pubnub, channelID);
    setUsers(usersInChannel);
    const alice = usersInChannel.find((user) => user.uuid !== userId);

    // if alice is already connected,
    // get alice's publicKey
    if (alice) {
      const key = await getPublicKey({ userId: alice.uuid, channel: channelID });
      setReceiverPublicKey(strToTypedArr(key.publicKey));
    }
  };

  const initChat = async () => {
    // TODO: handle error
    const messages = await fetchMessages(pubnub, channelID);
    setMessages(messages);

    pubnub.addListener({
      status: (statusEvent) => {
        // console.log('statusEvent', statusEvent);
      },
      message: (msg) => {
        // new message
        if (msg.channel === channelID) {
          setMessages((prevMsg) => prevMsg.concat(msg.message));
        }
      },
      presence: async ({ action, uuid: _userId }) => {
        // some user might have joined or left
        // let's update the userlist

        const usersInChannel = await getUsersInChannel(pubnub, channelID);
        setUsers(usersInChannel);

        if (action === 'join' && _userId !== userId) {
          const key = await getPublicKey({ userId: _userId, channel: channelID });
          setReceiverPublicKey(strToTypedArr(key.publicKey));
        }
      }
    });
  };

  useEffect(() => {
    if (!subscribeKey) {
      throw new Error('Configure subscribeKey (PUBNUB)');
    }
    getSetUsers(channelID);

    //this will send the public key
    exchangePublicKey(channelID);
    initChat();
  }, [channelID]);

  const alice = usersInChannel.find((u) => u.uuid !== userId);

  return (
    <>
      <div className={styles.userInfo}>
        {alice ? 'Alice <Online>' : 'Waiting for Alice to join..'}
      </div>
      <div className={styles.messageContainer}>
        <div className={styles.messageBlock}>
          <div>
            {messages.map(({ body, sender }, i) => (
              <div key={i}>
                <b>{sender === userId ? 'You: ' : 'Alice: '}</b>
                {body}
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className={styles.sendMessageForm}>
          <input
            className={styles.sendMessageInput}
            type="text"
            placeholder="Write message"
            onChange={(e) => setText(e.target.value)}
            value={text}
          />
          <div className={styles.sendButton} type="submit" role="button" onClick={handleSubmit}>
            Send
          </div>
        </form>
      </div>
    </>
  );
};

export default Chat;
