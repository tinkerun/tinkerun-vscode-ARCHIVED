import TextInputField from '../TextInputField'
import useCommand from '../../hooks/useCommand'

const CommandInput = () => {
  const {command, setCommand} = useCommand()

  const handleChange = e => {
    setCommand(e.target.value)
  }

  return (
    <TextInputField
      label='Command'
      description='Command to start running your tinker shell'
      value={command}
      onChange={handleChange}
    />
  )
}

export default CommandInput
