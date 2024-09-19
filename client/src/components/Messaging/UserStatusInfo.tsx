import React, { useEffect, useState } from "react";
import styles from "./styles/UserStatusInfo.module.css";
import ThemeToggle from "../ThemeToggle/index";
import imageRetryIcon from "./assets/image-retry.png";
import DeleteChatLink from "../DeleteChatLink";
import Button from "../Button";
import { IChatE2EE } from "@chat-e2ee/service";

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
  const [ call, setCall ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ callState, setCallState ] = useState(undefined);

  useEffect(() => {
    chate2ee.onCallAdded((call) => {
      setCall(call);
    });

    chate2ee.onCallRemoved(() => {
      setCall(null);
    });

    chate2ee.onPCStateChanged((state) => {
      setCallState(state);
    });
  }, [chate2ee]);

  const makeCall = async () => {
    if(call) {
      console.error('call is already active');
      return;
    }

    const newCall = await chate2ee.startCall();
    setCall(newCall);
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