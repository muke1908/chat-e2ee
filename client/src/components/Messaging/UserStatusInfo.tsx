import React, { useEffect, useState } from "react";
import styles from "./styles/UserStatusInfo.module.css";
import ThemeToggle from "../ThemeToggle/index";
import imageRetryIcon from "./assets/image-retry.png";
import DeleteChatLink from "../DeleteChatLink";
import Button from "../Button";
import { IChatE2EE, IE2ECall } from "@chat-e2ee/service";

export const UserStatusInfo = ({
  online,
  getSetUsers,
  channelID,
  handleDeleteLink,
  chate2ee
}: {
  online: any;
  getSetUsers: any;
  channelID: any;
  handleDeleteLink: any;
  chate2ee: IChatE2EE
}) => {
  const [ call, setCall ] = useState<IE2ECall>(null);
  const [loading, setLoading] = useState(false);
  const [ callState, setCallState ] = useState<RTCPeerConnectionState>(undefined);

  useEffect(() => {
    chate2ee.on('call-added', (call) => {
      setCall(call);
    });

    chate2ee.on('call-removed', () => {
      setCall(null);
    });
  }, [chate2ee]);

  useEffect(() => {
    if(call) {
      call.on('state-changed', () => {
        setCallState(call.state);
      })
    }
  }, [call])
  const makeCall = async () => {
    if(call) {
      console.error('call is already active');
      return;
    }

    try {
      const newCall = await chate2ee.startCall();
      setCall(newCall);
    }catch(err) {
      alert('Not supported.');
    }
  }

  const stopCall = async() => {
    chate2ee.endCall();
    setCall(null);
  }

  const fetchKeyAgain = async () => {
    if (loading) return;

    setLoading(true);
    await getSetUsers(channelID);
    setLoading(false);
  };

  return (
    <>
      { call && (<CallStatus state={callState}/>) }
      <div className={styles.userInfo}>
        {online ? (
          <span className={styles.userInfoOnline}>
            {"<"}Online{">"}
          </span>
        ) : (
          <div className={styles.userOnlineWaiting}>
            Waiting for Alice to join...
            <img
              className={
                loading ? `${styles.retryImageIcon} ${styles.loading}` : `${styles.retryImageIcon}`
              }
              src={imageRetryIcon}
              onClick={fetchKeyAgain}
              alt="retry-icon"
            />
          </div>
        )}
        {
          online && <CallButton makeCall={makeCall} stopCall={stopCall} call={call}/>
        }
        <DeleteChatLink handleDeleteLink={handleDeleteLink} />
        <ThemeToggle />
      </div>
    </>
  );
};


const CallStatus = ({state}: {state:any}) => {
  return(
    <div className={styles.callStatusBar}>Call Status: {state}</div>
  )
}

const CallButton = ({ makeCall, stopCall, call }: { makeCall: any, stopCall: any, call: any }) => {
  const callButtonHandler = () => {
    if(call) {
      stopCall();
    }else {
      makeCall();
    }
  }
  return (
    <div>
      <Button  onClick={callButtonHandler} label = { call ? 'Stop' : 'Call' } type="primary"/>
    </div>
  )
}