type ImagePickerResult = {
  base64: string;
  fileName: string;
};

const imagePicker = (e: any): Promise<ImagePickerResult> => {
  e.preventDefault();
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    let file = e.target.files[0];
    let fileName = file.name;

    if (!file) {
      reject("No file selected");
    }

    reader.readAsDataURL(file);

    reader.onload = (e: any) => {
      resolve({
        fileName,
        base64: e.target.result
      });
    };

    reader.onerror = reject;
  });
};

export default imagePicker;
