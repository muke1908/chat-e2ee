import React, { useRef, useEffect, useState } from "react";
import styles from "./styles/ScrollWrapper.module.css";

type ScrollWrapperProps = {
  children: React.ReactNode;
  messageCount: number;
};

export const ScrollWrapper = ({ children, messageCount }: ScrollWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      setIsAtBottom(wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight);
    };

 const wrapperElement = wrapperRef.current;
    if (wrapperElement) {
      wrapperElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (wrapperElement) {
        wrapperElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (isAtBottom && messageCount > 0) {
      scrollToBottom();
    }
  }, [messageCount, isAtBottom]);

  useEffect(() => {
    if (!isAtBottom && messageCount > 0) {
      setShowPopup(true);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount]);

  const scrollToBottom = () => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
    }
    setShowPopup(false);
  };

  return (
    <div className={styles.scrollWrapper} ref={wrapperRef}>
      {children}
      {showPopup && (
        <div className={styles.popup} onClick={scrollToBottom}>
          New Messages
        </div>
      )}
    </div>
  );
};
