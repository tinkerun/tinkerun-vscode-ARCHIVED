export type MessageType = 'SET_COMMAND' | 'GET_COMMAND' | 'CONNECT' | 'GET_CONNECTED' | 'SET_CONNECTED'

export interface Message {
  type: MessageType
  payload?: any
}
