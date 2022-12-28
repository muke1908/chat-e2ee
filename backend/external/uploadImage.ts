import imgbb from "./imgbb";
// import imgur from "./imgur";

const uploadImage = async (base64) => {
  if (!base64) {
    throw new Error("base64 - required arg");
  }

  // const IMAGE_HOSTING_PROVIDER = "imgbb";
  return await imgbb(base64);
  // switch (IMAGE_HOSTING_PROVIDER) {
  //   case "imgbb":
  //     return await imgbb(base64);
  //   case "imgur":
  //     return await imgur(base64);
  // }
};

export default uploadImage;
