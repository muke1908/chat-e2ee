import React, { useCallback, useEffect, useState, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import socketIOClient from 'socket.io-client';

import {
  getUserSessionID,
  createUserSessionID,
  storeUserSessionID,
  getKeyPairFromCache,
  createKeyPair,
  storeKeyPair,
  typedArrayToStr,
  strToTypedArr,
  encryptMsg,
  decryptMsg,
  isEmptyMessage
} from './helpers';
import { ThemeContext } from '../../ThemeContext.js';

import { sendMessage, sharePublicKey, getPublicKey, getUsersInChannel } from '../../service';
import styles from './Style.module.css';
import { Message, UserStatusInfo, NewMessageForm, ScrollWrapper } from '../../components/Messaging';
import Notification from '../../components/Notification';
import LinkSharingInstruction from '../../components/Messaging/LinkSharingInstruction';
import notificationAudio from '../../components/Notification/audio.mp3';

const Chat = () => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedImg, setSelectedImg] = useState('');
  const [previewImg, setPreviewImg] = useState(false);
  const [usersInChannel, setUsers] = useState([]);
  const [notificationState, setNotificationState] = useState(false);
  const [deliveredID, setDeliveredID] = useState([]);
  const [darkMode] = useContext(ThemeContext);

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

  const playNotification = () => {
    setNotificationState(true);
    window.clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => {
      setNotificationState(false);
    }, 500);
  };

  const initPublicKey = (channelID) => {
    let _keyPair = getKeyPairFromCache(channelID);
    if (!_keyPair) {
      _keyPair = createKeyPair();
      storeKeyPair(channelID, _keyPair);

      //this will send the public key
      console.log('%cSharing public key.', 'color:red; font-size:16px');
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

    if (isEmptyMessage(text)) {
      alert('Please enter your message!');
      return;
    }

    if (!publicKeyRef.current) {
      alert('No one is in chat!');
      return;
    }

    setMessages((prevMsg) =>
      prevMsg.concat({
        body: text,
        image: selectedImg,
        sender: userId,
        local: true
      })
    );
    resetImageHandler();
  };

  const resetImageHandler = () => {
    setSelectedImg('');
    setPreviewImg(false);
    setText('');
  };

  const handleSend = useCallback(
    async (body, image, index) => {
      const { box, nonce } = encryptMsg({
        text: body,
        mySecretKey: myKeyRef.current.secretKey,
        alicePublicKey: publicKeyRef.current
      });

      const { id, timestamp } = await sendMessage({
        channelID,
        userId,
        image,
        text: {
          box: typedArrayToStr(box),
          nonce: typedArrayToStr(nonce)
        }
      });

      setMessages((prevMsg) => {
        const { ...message } = prevMsg[index];
        message.local = false;
        message.id = id;
        message.timestamp = timestamp;
        prevMsg[index] = message;
        return [...prevMsg];
      });
    },
    [channelID, userId]
  );

  const getSetUsers = async (channelID) => {
    const usersInChannel = await getUsersInChannel({ channel: channelID });

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
    // TODO: restore previous messages from local storage
  };

  useEffect(() => {
    // this is update the public key ref
    initPublicKey(channelID);

    const socket = socketIOClient(`/`);
    socket.emit('chat-join', {
      channelID,
      userID: userId,
      publicKey: typedArrayToStr(myKeyRef.current.publicKey)
    });
    socket.on('limit-reached', () => {
      setMessages((prevMsg) =>
        prevMsg.concat({
          image: '',
          body: `Sorry, can't be used by more than two users. Check if the link is open on other tab`,
          sender: ''
        })
      );
    });
    socket.on('delivered', (id) => {
      setDeliveredID((prev) => [...prev, id]);
    });
    // an event to notify that the other person is joined.
    socket.on('on-alice-join', ({ publicKey }) => {
      if (publicKey) {
        publicKeyRef.current = strToTypedArr(publicKey);
        playNotification();
      }
      getSetUsers(channelID);
    });

    socket.on('on-alice-disconnect', () => {
      console.log('alice disconnected!!');
      publicKeyRef.current = null;
      playNotification();

      getSetUsers(channelID);
    });

    //handle incoming message
    socket.on('chat-message', (msg) => {
      try {
        const box = strToTypedArr(msg.message.box);
        const nonce = strToTypedArr(msg.message.nonce);
        const { msg: _msg } = decryptMsg({
          box,
          nonce,
          mySecretKey: myKeyRef.current.secretKey,
          alicePublicKey: publicKeyRef.current
        });
        setMessages((prevMsg) =>
          prevMsg.concat({
            image: msg.image,
            body: _msg,
            sender: msg.sender,
            id: msg.id,
            timestamp: msg.timestamp
          })
        );
        socket.emit('received', { channel: msg.channel, sender: msg.sender, id: msg.id });
      } catch (err) {
        console.error(err);
      }
    });

    getSetUsers(channelID);
    initChat();

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelID]);

  const alice = usersInChannel.find((u) => u.uuid !== userId);
  console.log(messages);
  const messagesFormatted = messages.map(({ body, sender, image, local, id, timestamp }, i) => {
    return {
      owner: sender === userId,
      body,
      image,
      local,
      id,
      timestamp
    };
  });

  return (
    <>
      <UserStatusInfo online={alice} getSetUsers={getSetUsers} channelID={channelID} />

      <div className={styles.messageContainer}>
        <div className={`${styles.messageBlock} ${!darkMode && styles.lightModeContainer}`}>
          <ScrollWrapper messageCount={messagesFormatted.length}>
            {messagesFormatted.map((message, index) => (
              <Message
                key={index}
                handleSend={handleSend}
                index={index}
                message={message}
                deliveredID={deliveredID}
              />
            ))}
            {!alice && <LinkSharingInstruction link={window.location.href} />}
          </ScrollWrapper>
        </div>
        <NewMessageForm
          handleSubmit={handleSubmit}
          text={text}
          setText={setText}
          selectedImg={selectedImg}
          setSelectedImg={setSelectedImg}
          previewImg={previewImg}
          setPreviewImg={setPreviewImg}
          resetImage={resetImageHandler}
        />
      </div>
      <Notification play={notificationState} audio={notificationAudio} />
    </>
  );
};

export default Chat;
