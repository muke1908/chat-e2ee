import React, { useContext, useState } from "react";
import imagePicker from "../../../utils/imagePicker.tsx";
import { ThemeContext } from "../../../ThemeContext.js";
import imagePickerIcon from "./assets/image-picker.png";
import imagePickerIconDark from "./assets/image-picker-black.png";
import Image from "../../Image/index.js";
import styles from "./Style.module.css";

const ImagePicker = (props: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode] = useContext(ThemeContext);
  const { selectedImg, setSelectedImg, setText, previewImg, setPreviewImg } = props;

  const handleShowDialog = (e: any) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const selectImage = async (e: any) => {
    // maintain the property reference after event callback in order to clean up
    e.persist();
    const { base64: imgUrl, fileName } = await imagePicker(e);
    if (imgUrl) {
      setPreviewImg(true);
      setSelectedImg(imgUrl);
      setText(fileName);
    }
    // clean up the targeted HTML element to render
    // else html sense no change and not render if you choose same image after cancelation once
    e.target.value = "";
  };

  return (
    <div className={styles.imagePickerContainer}>
      <label className={styles.imagePickerLabel}>
        <input
          className={styles.inputImagePicker}
          type="file"
          accept="image/png, image/jpeg"
          onChange={selectImage}
        />
        {previewImg ? (
          <div>
            <span onClick={handleShowDialog}>
              <Image src={selectedImg} maxWidth="45px" maxHeight="auto" />
            </span>
            {isOpen && (
              <dialog className={styles.dialog} open onClick={handleShowDialog}>
                <img className={styles.dialogContent} src={selectedImg} alt="file-zoom" />
              </dialog>
            )}
          </div>
        ) : (
          <img
            className={styles.imagePickerIcon}
            src={darkMode ? imagePickerIcon : imagePickerIconDark}
            alt="file-upload"
          />
        )}
      </label>
    </div>
  );
};
export default ImagePicker;
