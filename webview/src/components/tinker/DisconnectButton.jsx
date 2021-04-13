import Button from '../Button'
import {DISCONNECT} from '../../constants'

const DisconnectButton = (props) => {
  const handleClick = () => {
    vscode.postMessage({
      type: DISCONNECT,
    })
  }

  return (
    <Button
      onClick={handleClick}
      appearance='secondary'
      {...props}
    >
      Disconnect
    </Button>
  )
}

export default DisconnectButton
