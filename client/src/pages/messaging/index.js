import React, { useCallback, useEffect, useState, useRef, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';

import { createChatInstance, generateUUID, cryptoUtils } from '@chat-e2ee/service';

import {
  getUserSessionID,
  storeUserSessionID,
  getKeyPairFromCache,
  storeKeyPair,
  isEmptyMessage
} from './helpers';

import { ThemeContext } from '../../ThemeContext.js';
import styles from './Style.module.css';
import { Message, UserStatusInfo, NewMessageForm, ScrollWrapper } from '../../components/Messaging';
import Notification from '../../components/Notification';
import LinkSharingInstruction from '../../components/Messaging/LinkSharingInstruction';
import notificationAudio from '../../components/Notification/audio.mp3';
import { LS, SS } from '../../utils/storage';

const chate2ee = createChatInstance();
let userId = getUserSessionID();
// if not in session, lets create one and store.
if (!userId) {
  userId = generateUUID();
}

const Chat = () => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedImg, setSelectedImg] = useState('');
  const [previewImg, setPreviewImg] = useState(false);
  const [usersInChannel, setUsers] = useState([]);
  const [notificationState, setNotificationState] = useState(false);
  const [deliveredID, setDeliveredID] = useState([]);
  const [darkMode] = useContext(ThemeContext);
  const [linkActive, setLinkActive] = useState(true);
  const history = useHistory();


  const myKeyRef = useRef(null);
  const notificationTimer = useRef(null);

  const { channelID } = useParams();

  useEffect(() => {
    storeUserSessionID(channelID, userId);
  }, [ channelID ]);

  useEffect(() => {
    if (LS.get('store-chat-messages')) {
      SS.set(`chat#${channelID}`, messages);
    }
  }, [channelID, messages]);

  const playNotification = () => {
    setNotificationState(true);
    window.clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => {
      setNotificationState(false);
    }, 500);
  };

  const initPublicKey = async (channelID) => {
    let _keyPair = getKeyPairFromCache(channelID);
    if (!_keyPair) {
      _keyPair = await cryptoUtils.generateKeypairs();
      storeKeyPair(channelID, _keyPair);

      // share public key
      console.log('New public key generated');
    }
    myKeyRef.current = _keyPair;
    chate2ee.setChannel(channelID, userId, _keyPair.publicKey);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEmptyMessage(text)) {
      alert('Please enter your message!');
      return;
    }

    if (!chate2ee.isEncrypted()) {
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
      if (!chate2ee.isEncrypted()) {
        alert('Key not received / No one in chat');
      }

      const { id, timestamp } = await chate2ee.encrypt({ image, text: body }).send();


      setMessages((prevMsg) => {
        const { ...message } = prevMsg[index];
        message.local = false;
        message.id = id;
        message.timestamp = timestamp;
        prevMsg[index] = message;
        return [...prevMsg];
      });
    },
    []
  );

  const getSetUsers = async () => {
    const usersInChannel = [];

    try {
      const users = await chate2ee.getUsersInChannel();
      usersInChannel.push(...users);
    } catch (err) {
      console.error(err);
    }

    setUsers(usersInChannel);
    const alice = usersInChannel.find((user) => user.uuid !== userId);

    // if alice is already connected,
    // get alice's publicKey
    if (alice) {
      const key = await chate2ee.getPublicKey();
      chate2ee.setPublicKey(key.publicKey);
      playNotification();
    }
  };

  const handleDeleteLink = async () => {
    setLinkActive(false);
    await chate2ee.delete();
    history.push('/');
  };

  const initChat = async () => {
    // restore previous messages from session storage
    const messages = SS.get(`chat#${channelID}`, true)
    if (!messages) {
      return;
    }

    setMessages((prevMsg) => prevMsg.concat(messages));
  };

  useEffect(() => {
    // this is update the public key ref
    initPublicKey(channelID).then(() => {
      chate2ee.on('limit-reached', () => {
        setMessages((prevMsg) =>
          prevMsg.concat({
            image: '',
            body: `Sorry, can't be used by more than two users. Check if the link is open on other tab`,
            sender: ''
          })
        );
      });
      chate2ee.on('delivered', (id) => {
        setDeliveredID((prev) => [...prev, id]);
      });
      // an event to notify that the other person is joined.
      chate2ee.on('on-alice-join', ({ publicKey }) => {
        if (publicKey) {
          chate2ee.setPublicKey(publicKey);
          playNotification();
        }
        getSetUsers();
      });

      chate2ee.on('on-alice-disconnect', () => {
        console.log('alice disconnected!!');
        chate2ee.setPublicKey(null);
        playNotification();

        getSetUsers();
      });


      //handle incoming message
      chate2ee.on('chat-message', async (msg) => {
        try {
          const message = await cryptoUtils.decryptMessage(msg.message, myKeyRef.current.privateKey);
          setMessages((prevMsg) =>
            prevMsg.concat({
              image: msg.image,
              body: message,
              sender: msg.sender,
              id: msg.id,
              timestamp: msg.timestamp
            })
          );
        } catch (err) {
          console.error(err);
        }
      });

      getSetUsers();
      initChat();
    });
    return () => chate2ee.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelID]);

  const alice = usersInChannel.find((u) => u.uuid !== userId);
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
  if (linkActive) {
    return (
      <>
        <UserStatusInfo
          online={alice}
          getSetUsers={getSetUsers}
          channelID={channelID}
          handleDeleteLink={handleDeleteLink}
        />

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
              {!alice && (
                <LinkSharingInstruction
                  link={window.location.href}
                  pin={new URLSearchParams(window.location.search).get('pin')}
                  darkMode={darkMode}
                />
              )}
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
  } else {
    return (
      <div className={styles.messageContainer}>
        <div className={`${styles.messageBlock} ${!darkMode && styles.lightModeContainer}`}>
          <p>This link is no longer active</p>
        </div>
      </div>
    );
  }
};

export default Chat;
