import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  strToTypedArr,
  encryptMsg,
  decryptMsg
} from './helpers';

import { sendMessage, sharePublicKey, getPublicKey } from '../../service';
import styles from './Style.module.css';
import {
  MessageList,
  UserStatusInfo,
  NewMessageForm,
  ScrollWrapper
} from '../../components/Messaging';
import Notification from '../../components/Notification';
import notificationAudio from '../../components/Notification/audio.mp3';
// create your key at https://www.pubnub.com/
const subscribeKey = process.env.REACT_APP_PUBNUB_SUB_KEY;

const Chat = () => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [usersInChannel, setUsers] = useState([]);
  const [notificationState, setNotificationState] = useState(false);

  const myKeyRef = useRef(null);
  const publicKeyRef = useRef(null);

  const notificationTimer = useRef(null);

  const { channelID } = useParams();
  let userId = getUserSessionID(channelID);

  // if not in session, lets create one and store.
  if (!userId) {
    userId = createUserSessionID(channelID);
    storeUserSessionID(channelID, userId);
  }

  const pubnub = useMemo(() => {
    return pubnubInit({ subscribeKey, userId, channelID });
  }, [userId, channelID]);

  const playNotification = () => {
    setNotificationState(true);
    window.clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => {
      setNotificationState(false);
      console.log('getting called');
    }, 500);
  };

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

    myKeyRef.current = _keyPair;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // TODO: show it in the UI that, still waiting for alice's public key
    // either no joined the chat, or try fetching public manually
    // need a button to refresh

    if (!publicKeyRef.current) {
      alert('No one is in chat!');
      return;
    }
    try {
      const { box, nonce } = encryptMsg({
        text,
        mySecretKey: myKeyRef.current.secretKey,
        alicePublicKey: publicKeyRef.current
      });

      sendMessage({
        channelID,
        userId,
        text: {
          box: typedArrayToStr(box),
          nonce: typedArrayToStr(nonce)
        }
      });

      setText('');
    } catch (err) {
      alert('Failed to send message!');
      console.error(err);
    }
  };

  const getSetUsers = async (channelID) => {
    const usersInChannel = await getUsersInChannel(pubnub, channelID);
    setUsers(usersInChannel);
    const alice = usersInChannel.find((user) => user.uuid !== userId);

    // if alice is already connected,
    // get alice's publicKey
    if (alice) {
      const key = await getPublicKey({ userId: alice.uuid, channel: channelID });
      publicKeyRef.current = strToTypedArr(key.publicKey);
      playNotification();
    }
  };

  const initChat = async () => {
    // TODO: handle error
    const messages = await fetchMessages(pubnub, channelID);
    // console.log(messages);
    const formatMessages = messages.map((msg) => {
      const {
        sender,
        body: { box, nonce }
      } = msg;

      return {
        encrypted: true,
        encryptionDetail: { box, nonce },
        sender,
        body: btoa(strToTypedArr(box)) // let's just stringify the array, to decrypt later
      };
    });
    setMessages(formatMessages);

    pubnub.addListener({
      status: (statusEvent) => {
        // console.log('statusEvent', statusEvent);
      },
      message: (msg) => {
        // new message
        if (msg.channel === channelID) {
          try {
            const box = strToTypedArr(msg.message.body.box);
            const nonce = strToTypedArr(msg.message.body.nonce);

            const { msg: _msg } = decryptMsg({
              box,
              nonce,
              mySecretKey: myKeyRef.current.secretKey,
              alicePublicKey: publicKeyRef.current
            });

            setMessages((prevMsg) =>
              prevMsg.concat({
                body: _msg,
                sender: msg.message.sender
              })
            );
          } catch (err) {
            console.error(err);
          }
        }
      },
      presence: async ({ action, uuid: _userId }) => {
        // some user might have joined or left
        // let's update the userlist

        const usersInChannel = await getUsersInChannel(pubnub, channelID);
        setUsers(() => usersInChannel);

        if (action === 'join' && _userId !== userId) {
          const key = await getPublicKey({ userId: _userId, channel: channelID });
          publicKeyRef.current = strToTypedArr(key.publicKey);
          playNotification();
        }

        if (action === 'timeout' && _userId !== userId) {
          publicKeyRef.current = null;
          playNotification();
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
  const messagesFormatted = messages.map(({ body, sender, encrypted }, i) => {
    return {
      owner: sender === userId,
      body
    };
  });
  return (
    <>
      <UserStatusInfo online={alice} />
      <div className={styles.messageContainer}>
        <div className={styles.messageBlock}>
          <ScrollWrapper messageCount={messagesFormatted.length}>
            <MessageList data={messagesFormatted} />
          </ScrollWrapper>
        </div>
        <NewMessageForm handleSubmit={handleSubmit} text={text} setText={setText} />
      </div>
      <Notification play={notificationState} audio={notificationAudio} />
    </>
  );
};

export default Chat;
