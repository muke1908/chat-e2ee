// router.response
export type MessageResponse = { message: string, id: string, timestamp: number }
export type SharePublicKeyResponse = { status: string }
export type GetPublicKeyResponse = { public_key: string }
export type UsersInChannelResponse = { uuid: string }[]


// socket.emit
export type ChatMessageType = {
    channel: string,
    sender: string,
    message: string,
    id: number,
    timestamp: number,
    image?: string
}