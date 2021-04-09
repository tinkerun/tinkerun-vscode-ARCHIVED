import PropTypes from 'prop-types'

const Button = ({children, className, ...rest}) => {
  return (
    <button
      className='btn-primary'
      {...rest}
    >
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.any.isRequired,
  className: PropTypes.string,
}

Button.defaultProps = {
  className: '',
}

export default Button
