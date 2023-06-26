import React, { useRef, useContext } from "react";
import styles from "./styles/NewMessageForm.module.css";
import { ThemeContext } from "../../ThemeContext";
import ImagePicker from "./ImagePicker";
import RemoveButton from "./RemoveButton";
import EmojiRow from "./EmojiRow";
import detectMobile from "../../utils/detectMobile";
import emojiPickerIcon from "./assets/emoji-picker.png";
import emojiPickerIconDark from "./assets/emoji-picker-black.png";

type SetStateType<T> = React.Dispatch<React.SetStateAction<T>>;
type NewMessageFormProps = {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  text: string;
  setText: SetStateType<string>;
  selectedImg?: string;
  setSelectedImg?: SetStateType<string>;
  previewImg?: boolean;
  setPreviewImg?: SetStateType<boolean>;
  resetImage: () => void;
};

export const NewMessageForm = ({
  handleSubmit,
  text,
  setText,
  selectedImg,
  setSelectedImg,
  previewImg,
  setPreviewImg,
  resetImage
}: NewMessageFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [darkMode] = useContext(ThemeContext);
  const [emojiVisibility, setEmojiVisibility] = React.useState(false);

  const wrapperHandler = (event: React.MouseEvent<HTMLDivElement>) => {
    inputRef.current?.focus();
    // handleSubmit;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${styles.sendMessageForm} ${!darkMode && styles.lightsendMessageForm}`}
    >
      <div className={styles.emojiMessageContainer}>
        <div
          className={`${
            emojiVisibility ? styles.emojiRowContainerOpen : styles.emojiRowContainer
          } ${!darkMode && styles.lightEmojiRowContainer}`}
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
          {selectedImg === "" ? null : <RemoveButton onClick={resetImage} />}
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
            {!detectMobile() && (
              <div className={styles.emojiPickerContainer}>
                <img
                  className={styles.emojiPickerIcon}
                  src={darkMode ? emojiPickerIcon : emojiPickerIconDark}
                  alt="emoji-picker"
                  onClick={() => setEmojiVisibility(!emojiVisibility)}
                />
              </div>
            )}
            <div
              className={`${styles.sendButton} ${!darkMode && styles.lightModeSend}`}
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
