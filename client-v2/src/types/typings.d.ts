declare module "*.module.css";
declare module "*.mp3"
declare module "*.png"
// custom-types.d.ts
declare module '@chat-e2ee/service'
interface LinkObjType {
    absoluteLink?: string;
    hash?: string;
}

type TypeUsersInChannel = Array<{
    // Define the structure of user objects here
    uuid: string;
  }>;