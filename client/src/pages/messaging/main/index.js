import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

import {
  pubnubInit,
  getUsersInChannel,
  fetchMessages,
  getUserSessionID,
  createUserSessionID,
  storeUserSessionID
} from './../helpers';

import { sendMessage } from '../../../service';
import styles from './Style.module.css';

// create your key at https://www.pubnub.com/
const subscribeKey = process.env.REACT_APP_PUBNUB_SUB_KEY;

const Chat = () => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [usersInChannel, setUsers] = useState([]);

  const { uuid } = useParams();

  let userId = getUserSessionID(uuid);

  // if not in session, lets create one and store.
  if (!userId) {
    userId = createUserSessionID(uuid);
    storeUserSessionID(uuid, userId);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage({ uuid, userId, text });
    setText('');
  };

  const initChat = async () => {
    const pubnub = pubnubInit({ subscribeKey, userId, uuid });

    // TODO: handle error
    const messages = await fetchMessages(pubnub, uuid);
    setMessages(messages);

    const usersInChannel = await getUsersInChannel(pubnub, uuid);
    setUsers(usersInChannel);

    pubnub.addListener({
      status: (statusEvent) => {
        // console.log('statusEvent', statusEvent);
      },
      message: (msg) => {
        setMessages((prevMsg) => prevMsg.concat(msg.message));
      },
      presence: (presenceEvent) => {
        // console.log('presenceEvent', presenceEvent);
      }
    });
  };

  useEffect(() => {
    if (!subscribeKey) {
      throw new Error('Configure subscribeKey (PUBNUB)');
    }
    initChat();
  }, []);

  return (
    <>
      <div>
        <h3>Edit ./client/chat/index.js and make me beautiful</h3>
      </div>
      <br />
      <div>
        Users in this channel :{' '}
        {usersInChannel.map((u) => (
          <div key={u.uuid}>{u.uuid}</div>
        ))}
      </div>
      <br />
      <div
        style={{
          background: '#999',
          height: '65vh',
          paddingBottom: '60px',
          paddingTop: '30px',
          paddingLeft: '30px',
          paddingRight: '30px',
          marginBottom: '30px'
        }}
      >
        <div
          style={{
            background: '#fff',
            height: '65vh',
            paddingTop: '30px',
            paddingLeft: '30px'
          }}
        >
          <div>
            {messages.map(({ body, sender }, i) => (
              <div key={i}>
                <b>{sender === userId ? 'You: ' : 'They: '}</b>
                {body}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            background: '#fff',
            alignItems: 'flex-start',
            height: '52px',
            width: '800px'
          }}
        >
          <input
            type="text"
            placeholder="write message"
            onChange={(e) => setText(e.target.value)}
            value={text}
            style={{
              height: '100%',
              width: '700px',
              borderWidth: '0.3px',
              borderColor: '#ddd',
              outline: 'None',
              fontFamily: 'inherit',
              fontSize: '18px'
            }}
          />
          <button
            type="submit"
            style={{
              height: '100%',
              width: '100px',
              fontFamily: 'inherit',
              fontSize: '18px'
            }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
};

export default Chat;
