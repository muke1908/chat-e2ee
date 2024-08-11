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
    const wrapper = wrapperRef.current;
    const handleScroll = () => {
      if (!wrapper) return;
      const atBottom = wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 1;
      setIsAtBottom(atBottom);

      // Hide popup if scrolled to bottom
      if (atBottom) {
        setShowPopup(false);
      }
    };

    if (wrapper) {
      wrapper.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (wrapper) {
        wrapper.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    } else {
      setShowPopup(true);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount]);

  const scrollToBottom = () => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      setShowPopup(false);
      wrapper.scrollTop = wrapper.scrollHeight;
    }
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
