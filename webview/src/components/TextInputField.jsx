import PropTypes from 'prop-types'

const TextInputField = ({label, description, ...rest}) => (
  <div className='field'>
    <label className='field-label'>{label}</label>
    {description && (
      <p className='field-description'>{description}</p>
    )}
    <input
      className='field-input'
      {...rest}
    />
  </div>
)

TextInputField.displayName = 'TextInputField'

TextInputField.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
}

TextInputField.defaultProps = {
  description: '',
}

export default TextInputField
