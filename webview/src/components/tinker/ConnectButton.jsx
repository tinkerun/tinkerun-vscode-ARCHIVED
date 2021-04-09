import Button from '../Button'
import {CONNECT} from '../../constants'
import useConnected from '../../hooks/useConnected'

const ConnectButton = () => {
  const connected = useConnected()

  const handleClick = () => {
    vscode.postMessage({
      type: CONNECT,
    })
  }

  return (
    <div className='p-4'>
      {
        connected
          ? (
            <Button disabled={true}>Connected</Button>
            )
          : (
            <Button onClick={handleClick}>Connect</Button>
            )
      }
    </div>
  )
}

export default ConnectButton
