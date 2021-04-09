import {useEffect, useState} from 'react'

import {GET_CONNECTED, SET_CONNECTED} from '../constants'

const useConnected = () => {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    vscode.postMessage({
      type: GET_CONNECTED,
    })

    const listener = e => {
      const message = e.data
      if (message.type === SET_CONNECTED) {
        setConnected(message.payload)
      }
    }

    window.addEventListener('message', listener)

    return () => {
      window.removeEventListener('message', listener)
    }
  }, [])

  return connected
}

export default useConnected
