import React, { useState, createContext } from 'react';
import storage from './utils/storage.js';

export const LockContext = createContext();

let defaultLockMode = storage.get('locked');
defaultLockMode = defaultLockMode === null ? false : defaultLockMode;

export const LockProvider = (props) => {
    const [lockMode, setLockMode] = useState(defaultLockMode);
    return (
        <LockContext.Provider value={[lockMode, setLockMode]}>{props.children}</LockContext.Provider>
    );
};