import React, {useContext} from 'react';
import imagePicker from '../../../utils/imagePicker.js';
import { ThemeContext } from '../../../ThemeContext';
import imagePickerIcon from './assets/image-picker.png';
import imagePickerIconDark from './assets/image-picker-black.png';
import Image from '../../Image';
import styles from './Style.module.css';

const ImagePicker = (props) => {
  const [darkMode] = useContext(ThemeContext);
  const { selectedImg, setSelectedImg, setText, previewImg, setPreviewImg } = props;
  const selectImage = async (e) => {
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
    e.target.value = '';
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
          <Image src={selectedImg} maxWidth="45px" maxHeight="auto" />
        ) : (
          <img className={styles.imagePickerIcon} src={darkMode ? imagePickerIcon : imagePickerIconDark} alt="file-upload" />
        )}
      </label>
    </div>
  );
};
export default ImagePicker;
