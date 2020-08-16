const imagePicker = (e) => {
  e.preventDefault();
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    let file = e.target.files[0];

    reader.readAsDataURL(file);

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = reject;
  });
};

export default imagePicker;
