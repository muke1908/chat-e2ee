import React, { useRef, useEffect, useState } from "react";
import styles from "./styles/ScrollWrapper.module.css";

type ScrollWrapperProps = {
  children: React.ReactNode;
  messageCount: number;
};

export const ScrollWrapper = ({ children, messageCount }: ScrollWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [scrollAtBottom, setScrollAtBottom] = useState(true);

  useEffect(() => {
    if (wrapperRef.current) {
      const wrapper = wrapperRef.current;
      const isScrolledToBottom = wrapper.scrollHeight - wrapper.scrollTop === wrapper.clientHeight;
      setScrollAtBottom(isScrolledToBottom);
      if (isScrolledToBottom) {
        wrapper.scrollTop = wrapper.scrollHeight;
      } else {
        setShowPopup(true);
      }
    }
  }, [messageCount]);

  useEffect(() => {
    if (scrollAtBottom && wrapperRef.current) {
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
    }
  }, [scrollAtBottom, messageCount]);

  const scrollToBottom = () => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
      setShowPopup(false);
    }
  };

  const handleScroll = () => {
    if (wrapperRef.current) {
      const wrapper = wrapperRef.current;
      const isScrolledToBottom = wrapper.scrollHeight - wrapper.scrollTop === wrapper.clientHeight;
      setScrollAtBottom(isScrolledToBottom);
      setShowPopup(false);
    }
  };

  return (
    <div className={styles.scrollWrapper} ref={wrapperRef} onScroll={handleScroll}>
      {children}
      {showPopup && !scrollAtBottom && (
        <div className={styles.popup} onClick={scrollToBottom}>
          New Messages
        </div>
      )}
    </div>
  );
};
