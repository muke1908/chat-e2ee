import React, { useRef, useContext } from 'react';
import styles from './styles/NewMessageForm.module.css';
import { ThemeContext } from '../../ThemeContext.js';
import ImagePicker from './ImagePicker';
export const NewMessageForm = ({
  handleSubmit,
  text,
  setText,
  selectedImg,
  setSelectedImg,
  previewImg,
  setPreviewImg
}) => {
  const inputRef = useRef(null);
  const [darkMode] = useContext(ThemeContext);

  const wrapperHandler = (e) => {
    inputRef.current.focus();
    handleSubmit(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${styles.sendMessageForm} ${!darkMode && styles.lightsendMessageForm}`}
    >
      <input
        ref={inputRef}
        className={`${styles.sendMessageInput} ${!darkMode && styles.lightMessageInput}`}
        type="text"
        name="input_text"
        placeholder="Write message"
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
      <div className={styles.imagePickerContainer}>
        <ImagePicker
          selectedImg={selectedImg}
          setSelectedImg={setSelectedImg}
          setText={setText}
          previewImg={previewImg}
          setPreviewImg={setPreviewImg}
        />
      </div>
      <div
        className={`${styles.sendButton} ${!darkMode && styles.lightModeSend}`}
        type="submit"
        role="button"
        onClick={wrapperHandler}
      >
        Send
      </div>
    </form>
  );
};
