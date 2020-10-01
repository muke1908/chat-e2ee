import React, { useRef, useContext } from 'react';
import styles from './styles/NewMessageForm.module.css';
import { ThemeContext } from '../../ThemeContext.js';
import ImagePicker from './ImagePicker';
import RemoveButton from './RemoveButton';
import EmojiRow from './EmojiRow';
import detectMobile from '../../utils/detectMobile.js';
import emojiPickerIcon from './assets/emoji-picker.png';
import emojiPickerIconDark from './assets/emoji-picker-black.png';

export const NewMessageForm = ({
  handleSubmit,
  text,
  setText,
  selectedImg,
  setSelectedImg,
  previewImg,
  setPreviewImg,
  resetImage
}) => {
  const inputRef = useRef(null);
  const [darkMode] = useContext(ThemeContext);
  const [emojiVisibility, setEmojiVisibility] = React.useState(false);

  const wrapperHandler = (e) => {
    inputRef.current.focus();
    handleSubmit(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${styles.sendMessageForm} ${!darkMode && styles.lightsendMessageForm}`}
    >
      <div className={styles.emojiMessageContainer}>
        <div
          className={`${styles.emojiRowContainer} ${!darkMode && styles.lightEmojiRowContainer}`}
        >
          {emojiVisibility && !detectMobile() && <EmojiRow text={text} setText={setText} />}
        </div>
        <div className={styles.msgBtnImgContainer}>
          <input
            ref={inputRef}
            className={`${styles.sendMessageInput} ${!darkMode && styles.lightMessageInput}`}
            type="text"
            name="input_text"
            placeholder="Write message"
            onChange={(e) => setText(e.target.value)}
            value={text}
            autoComplete="off"
          />
          {selectedImg === '' ? null : <RemoveButton onClick={resetImage} />}
          <div className={styles.buttonImageContainer}>
            <div className={styles.imagePickerContainer}>
              <ImagePicker
                selectedImg={selectedImg}
                setSelectedImg={setSelectedImg}
                setText={setText}
                previewImg={previewImg}
                setPreviewImg={setPreviewImg}
              />
            </div>
            <div className={styles.emojiPickerContainer}>
              <img
                className={styles.emojiPickerIcon}
                src={darkMode ? emojiPickerIcon : emojiPickerIconDark}
                alt="emoji-picker"
                onClick={() => setEmojiVisibility(!emojiVisibility)}
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
          </div>
        </div>
      </div>
    </form>
  );
};
