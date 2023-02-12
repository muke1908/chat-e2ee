import React, {useState} from 'react';
import {FiLock, FiUnlock} from 'react-icons/fi';
import styles from './Style.module.css';
import {lockChannel, unlockChannel} from "../../service/index";
import {useSelector, useDispatch} from "react-redux";
import {roomLock, roomUnlock} from "../../utils/lockRoomActions";

const LockRoom = ({channelId, sender}) => {
    const lockRoom = useSelector((state) => state.lockRoom.lock);

    const dispatch = useDispatch();
    const toggleLock = async (event) => {
        const value = event.currentTarget.getAttribute('data-value');

        if (+value === 1) {
            dispatch(roomLock());
            await lockChannel(channelId, sender);

        } else {
            dispatch(roomUnlock());
            await unlockChannel(channelId, sender);
        }
    };

    return (
        <span className={styles.toggleIcon}>
      {lockRoom === true ?
          <FiLock className={styles.FiLock} data-value={1} onClick={toggleLock}/>
          :
          <FiUnlock className={styles.FiUnlock} data-value={0} onClick={toggleLock}/>
      }
    </span>
    );
};

export default LockRoom;
