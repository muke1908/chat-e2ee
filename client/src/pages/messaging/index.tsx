import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
    createChatInstance, utils, TypeUsersInChannel, setConfig
} from '@chat-e2ee/service';

import { Message, NewMessageForm, ScrollWrapper, UserStatusInfo } from '../../components/Messaging';
import LinkSharingInstruction from '../../components/Messaging/LinkSharingInstruction';
import Notification from '../../components/Notification';
import notificationAudio from '../../components/Notification/audio.mp3';
import { ThemeContext } from '../../ThemeContext';
import { LS, SS } from '../../utils/storage';
import {
    getKeyPairFromCache, getUserSessionID, isEmptyMessage, storeKeyPair, storeUserSessionID
} from './helpers';
import styles from './Style.module.css';

if(process.env.NODE_ENV === 'development') {
  setConfig({
    apiURL: 'http://localhost:3000',
    socketURL: 'http://localhost:3000',
  })
} else {
setConfig({
    apiURL: `${window.location.protocol}//${window.location.hostname}` ,
    socketURL: `${window.location.protocol}//${window.location.hostname}`  ,
  })
}

const chate2ee = createChatInstance();
type messageObj = {
  body?: string;
  image?: string;
  sender?: string;
  id?: string;
  local?: boolean;
  timestamp?: any;
}[];

const Chat = () => {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<messageObj>([]);
  const [selectedImg, setSelectedImg] = useState("");
  const [previewImg, setPreviewImg] = useState(false);
  const [usersInChannel, setUsers] = useState<{ uuid?: string }[]>([]);
  const [notificationState, setNotificationState] = useState(false);
  const [deliveredID, setDeliveredID] = useState<string[]>([]);
  const [darkMode] = useContext(ThemeContext);
  const [linkActive, setLinkActive] = useState(true);
  const navigate = useNavigate();

  const myKeyRef = useRef<{ privateKey?: string } | null>();
  const notificationTimer = useRef<number | undefined>(undefined);

  const params = useParams<{ channelID: string }>();
  const channelID = params.channelID;

  let userId = getUserSessionID(channelID);
  // if not in session, lets create one and store.
  if (!userId) {
    userId = utils.generateUUID();
  }

  useEffect(() => {
    storeUserSessionID(channelID, userId);
  }, [channelID, userId]);

  useEffect(() => {
    if (LS.get("store-chat-messages") && messages.length > 0) {
      SS.set(`chat#${channelID}`, messages);
    }
  }, [channelID, messages]);

  const playNotification = () => {
    setNotificationState(true);
    window.clearTimeout(notificationTimer.current);
    notificationTimer.current = window.setTimeout(() => {
      setNotificationState(false);
    }, 500);
  };

  const initPublicKey = async (channelID: string) => {
    await chate2ee.init();
    let _keyPair = getKeyPairFromCache(channelID);
    if (!_keyPair) {
      _keyPair = chate2ee.getKeyPair();
      storeKeyPair(channelID, _keyPair);

      // share public key
      console.log("KeyPair received");
    }
    myKeyRef.current = _keyPair;
    chate2ee.setChannel(channelID, userId);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEmptyMessage(text)) {
      alert("Please enter your message!");
      return;
    }

    if (!chate2ee.isEncrypted()) {
      alert("No one is in chat!");
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
    setSelectedImg("");
    setPreviewImg(false);
    setText("");
  };

  const handleSend = useCallback(async (body: string, image: string, index: number) => {
    if (!chate2ee.isEncrypted()) {
      alert("Key not received / No one in chat");
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
  }, []);

  const getSetUsers = async () => {
    const usersInChannel: TypeUsersInChannel = [];

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
      playNotification();
    }
  };

  const handleDeleteLink = async () => {
    setLinkActive(false);
    await chate2ee.delete();
    navigate("/");
  };

  const initChat = async () => {
    // restore previous messages from session storage
    const messages = SS.get(`chat#${channelID}`);
    if (!messages) {
      return;
    }

    setMessages((prevMsg) => prevMsg.concat(messages));
  };

  useEffect(() => {
    // this is update the public key ref
    initPublicKey(channelID).then(() => {
      chate2ee.on("limit-reached", () => {
        setMessages((prevMsg) =>
          prevMsg.concat({
            image: "",
            body: `Sorry, can't be used by more than two users. Check if the link is open on other tab`,
            sender: ""
          })
        );
      });
      chate2ee.on("delivered", (id: string) => {
        setDeliveredID((prev) => [...prev, id]);
      });
      // an event to notify that the other person is joined.
      chate2ee.on("on-alice-join", ({ publicKey }: { publicKey: string | null }) => {
        if (publicKey) {
          playNotification();
        }
        getSetUsers();
      });

      chate2ee.on("on-alice-disconnect", () => {
        console.log("alice disconnected!!");
        playNotification();
        getSetUsers();
      });

      //handle incoming message
      chate2ee.on(
        "chat-message",
        async (msg: {
          message: string;
          image: string;
          sender: string;
          id: string;
          timestamp: number;
        }) => {
          if(!myKeyRef.current?.privateKey) {
            throw new Error("Private key not found!");
          }

          try {
            const message = await utils.decryptMessage(
              msg.message,
              myKeyRef.current.privateKey
            );
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
        }
      );

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
          chate2ee={chate2ee}
        />

        <div className={styles.messageContainer}>
          <div className={`${styles.messageBlock} ${!darkMode && styles.lightModeContainer}`}>
            <ScrollWrapper messageCount={messagesFormatted.length}>
              {messagesFormatted.map((message, index) => (
                <Message
                  key={message.id}
                  handleSend={handleSend}
                  index={index}
                  message={message}
                  deliveredID={deliveredID}
                />
              ))}
              {!alice && (
                <LinkSharingInstruction
                  link={window.location.href}
                  pin={new URLSearchParams(window.location.search).get("pin")}
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
