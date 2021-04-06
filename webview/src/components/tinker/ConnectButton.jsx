import Button from '../Button'
import {CONNECT} from '../../constants'

const ConnectButton = () => {
  const handleClick = () => {
    vscode.postMessage({
      type: CONNECT,
    })
  }

  return (
    <div className='p-4'>
      <Button
        onClick={handleClick}
      >
        Connect
      </Button>
    </div>
  )
}

export default ConnectButton
