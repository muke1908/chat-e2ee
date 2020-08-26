import React, { useRef, useContext, useState } from 'react';
import styles from './styles/NewMessageForm.module.css';
import { ThemeContext } from '../../ThemeContext.js';
import imagePicker from '../../utils/imagePicker.js';
import imagePickerIcon from './assets/image-picker.png';
import Image from '../Image';

export const NewMessageForm = ({ handleSubmit, text, setText }) => {
  const inputRef = useRef(null);
  const [darkMode] = useContext(ThemeContext);
  const [previewImage, setPreviewImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState([]);

  const wrapperHandler = (e) => {
    inputRef.current.focus();
    if (previewImage) {
      handleSubmit(e, selectedImage);
      setPreviewImage(false);
      setSelectedImage([]);
    } else {
      handleSubmit(e);
    }
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
          <input
            className={styles.inputImagePicker}
            type="file"
            onChange={async (e) => {
              let name = e.target.files[0].name;
              let imgUrl = await imagePicker(e);
              if (imgUrl) {
                setPreviewImage(true);
                setSelectedImage(imgUrl);
                setText(name);
              }
            }}
          />
          {previewImage ? (
            <Image src={selectedImage} maxWidth="45px" maxHeight="auto" />
          ) : (
            <img className={styles.imagePickerIcon} src={imagePickerIcon} alt="file-upload" />
          )}
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
