import React, { useRef, useEffect } from 'react';
import styles from './styles/ScrollWrapper.module.css';

export const ScrollWrapper = ({ children, messageCount }) => {
  const wrapperRef = useRef(null);
  useEffect(() => {
    wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
  }, [messageCount]);

  return (
    <div className={styles.scrollWrapper} ref={wrapperRef}>
      {children}
    </div>
  );
};
