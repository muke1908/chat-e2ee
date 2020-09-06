import React from 'react';
import imagePicker from '../../../utils/imagePicker.js';
import imagePickerIcon from './assets/image-picker.png';
import Image from '../../Image';
import styles from './Style.module.css';

const ImagePicker = (props) => {
  const { selectedImg, setSelectedImg, setText, previewImg, setPreviewImg } = props;
  const selectImage = async (e) => {
    const { base64: imgUrl, fileName } = await imagePicker(e);
    if (imgUrl) {
      setPreviewImg(true);
      setSelectedImg(imgUrl);
      setText(fileName);
    }
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
          <img className={styles.imagePickerIcon} src={imagePickerIcon} alt="file-upload" />
        )}
      </label>
    </div>
  );
};
export default ImagePicker;
