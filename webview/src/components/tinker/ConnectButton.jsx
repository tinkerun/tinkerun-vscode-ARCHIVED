import Button from '../Button'
import {CONNECT} from '../../constants'

const ConnectButton = (props) => {
  const handleClick = () => {
    vscode.postMessage({
      type: CONNECT,
    })
  }

  return (
    <Button
      onClick={handleClick}
      {...props}
    >
      Connect
    </Button>
  )
}

export default ConnectButton
