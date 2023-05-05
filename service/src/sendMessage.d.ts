declare const sendMessage: ({ channelID, userId, image, text }: {
    channelID: any;
    userId: any;
    image: any;
    text: any;
}) => Promise<any>;
export default sendMessage;
