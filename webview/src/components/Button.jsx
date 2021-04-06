import PropTypes from 'prop-types'
import cn from 'classnames'

const Button = ({children, className, ...rest}) => {
  return (
    <button
      className={cn(
        'bg-blue-500 hover:bg-blue-700 text-white px-1.5 text-sm leading-loose',
        className,
      )}
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
