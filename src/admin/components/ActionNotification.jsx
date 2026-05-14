import { useEffect, useState } from 'react'
import './ActionNotification.css'

function ActionNotification({ notification, onClose }) {
  useEffect(() => {
    if (!notification) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      onClose()
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [notification, onClose])

  if (!notification) {
    return null
  }

  return (
    <div className={`action-notification action-notification--${notification.variant}`} role="status" aria-live="polite">
      <span className="action-notification-text">{notification.message}</span>
      <button type="button" className="action-notification-close" onClick={onClose} aria-label="Fechar notificacao">
        x
      </button>
    </div>
  )
}

export function useActionNotification() {
  const [notification, setNotification] = useState(null)

  const showError = (message) => {
    setNotification({
      message,
      variant: 'error',
    })
  }

  const showSuccess = (message) => {
    setNotification({
      message,
      variant: 'success',
    })
  }

  const clearNotification = () => {
    setNotification(null)
  }

  return {
    notification,
    showError,
    showSuccess,
    clearNotification,
  }
}

export default ActionNotification
