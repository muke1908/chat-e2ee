import React, { useContext, useState } from 'react';
import { ThemeContext } from '../../ThemeContext.js';
import { BsLock, BsUnlock } from 'react-icons/bs';
import styles from './Style.module.css';
import storage from '../../utils/storage';
import { LockContext } from '../../LockContext.js';

const LockToggle = () => {
    const [darkMode] = useContext(ThemeContext);

    const [lockMode, setLockMode] = useState(false);
    // const lockMode = false;

    const toggleLock = () => {
        storage.set('locked', !lockMode);
        setLockMode(!lockMode);
    };

    return (
    <span className={styles.toggleLock}>
        {lockMode === true ? (
        <BsLock className={styles.BsLock} onClick={toggleLock} />
        ) : (
        <BsUnlock className={styles.BsUnlock} onClick={toggleLock} />
        )}
    </span>
    );
};

export default LockToggle;