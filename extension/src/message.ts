export type MessageType = 'SET_COMMAND' | 'CONNECT'

export interface Message {
  type: MessageType
  payload?: any
}

export interface SetCommandMessage extends Message {
  type: 'SET_COMMAND'
  payload: string
}

export interface ConnectMessage extends Message {
  type: 'CONNECT'
}
