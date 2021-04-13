import PropTypes from 'prop-types'
import cn from 'classnames'

const Button = ({children, className, appearance, ...rest}) => {
  return (
    <button
      className={cn(`btn btn-${appearance}`, className)}
      {...rest}
    >
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.any.isRequired,
  className: PropTypes.string,
  appearance: PropTypes.string,
}

Button.defaultProps = {
  className: '',
  appearance: 'primary',
}

export default Button
