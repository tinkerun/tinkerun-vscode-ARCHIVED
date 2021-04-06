import {useCallback, useEffect, useState} from 'react'
import debounce from 'lodash/debounce'

import {SET_COMMAND} from '../constants'

const useCommand = () => {
  const [command, setCommand] = useState('cd ~/example-app && php artisan tinker')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setCommandVSCode = useCallback(debounce(value => {
    vscode.postMessage({
      type: SET_COMMAND,
      payload: value,
    })
  }, 300), [])

  useEffect(() => {
    const listener = e => {
      const message = e.data
      if (message.type === SET_COMMAND) {
        setCommand(message.payload)
      }
    }

    // 绑定 command 更新事件
    window.addEventListener('message', listener)

    return () => {
      window.removeEventListener('message', listener)
    }
  }, [])

  return {
    command,
    setCommand: value => {
      setCommand(value)
      setCommandVSCode(value)
    },
  }
}

export default useCommand
