import React, { useRef, useContext } from 'react';
import styles from './styles/NewMessageForm.module.css';
import { ThemeContext } from '../../ThemeContext.js';
import imagePicker from '../../utils/imagePicker.js';
import imagePickerIcon from './assets/image-picker.png';

export const NewMessageForm = ({ handleSubmit, text, setText }) => {
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
        <label className={styles.imagePickerLabel}>
          <input className={styles.inputImagePicker} type="file" onChange={imagePicker} />
          <img className={styles.imagePickerIcon} src={imagePickerIcon} alt="file-upload" />
        </label>
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
