import {forwardRef} from 'react'
import PropTypes from 'prop-types'

const TextInputField = forwardRef(({label, description, className, ...rest}, ref) => {
  return (
    <div className='border border-transparent focus-within:border-gray-300 p-4'>
      <label className='text-sm font-bold text-gray-700'>{label}</label>
      {description && (
        <p className='text-xs text-gray-500'>{description}</p>
      )}
      <input
        ref={ref}
        className='border border-gray-300 focus:border-blue-500 outline-none px-1.5 block mt-2 w-full text-xs leading-loose text-gray-600'
        {...rest}
      />
    </div>
  )
})

TextInputField.displayName = 'TextInputField'

TextInputField.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
}

TextInputField.defaultProps = {
  description: '',
}

export default TextInputField
