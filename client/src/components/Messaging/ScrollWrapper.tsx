import React, { useRef, useEffect } from "react";
import styles from "./styles/ScrollWrapper.module.css";

type ScrollWrapperProps = {
  children: React.ReactNode;
  messageCount: number;
};

export const ScrollWrapper = ({ children, messageCount }: ScrollWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
    }
  }, [messageCount]);

  return (
    <div className={styles.scrollWrapper} ref={wrapperRef}>
      {children}
    </div>
  );
};
