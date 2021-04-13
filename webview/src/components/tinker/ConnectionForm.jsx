import CommandInput from './CommandInput'
import ConnectButton from './ConnectButton'
import DisconnectButton from './DisconnectButton'
import useConnected from '../../hooks/useConnected'
import cn from 'classnames'

const ConnectionForm = () => {
  const connected = useConnected()
  return (
    <div>
      <CommandInput/>
      <div className="p-4">
        <ConnectButton
          className={cn({
            hidden: connected,
            block: !connected,
          })}
        />
        <DisconnectButton
          className={cn({
            hidden: !connected,
            block: connected,
          })}
        />
      </div>
    </div>
  )
}

export default ConnectionForm
