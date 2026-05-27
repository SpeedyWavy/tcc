import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import user from '../../assets/place-user.png'
import { clearSession, getStoredUser } from '../../auth.js'
import styles from './UserMenu.module.css'

function UserMenu() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [usuarioLogado] = useState(() => getStoredUser())
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuAberto) {
      return undefined
    }

    const fecharAoClicarFora = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(false)
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora)
    }
  }, [menuAberto])

  const sairDaConta = () => {
    clearSession()
    window.location.href = '/'
  }

  return (
    <div className={styles.usuario} ref={menuRef}>
      <button
        type="button"
        className={styles['usuario-trigger']}
        onClick={() => setMenuAberto((atual) => !atual)}
        aria-haspopup="menu"
        aria-expanded={menuAberto}
      >
        <img src={user} alt="Usuario" />
        <span className={styles['usuario-nome']}>{usuarioLogado?.full_name || 'Usuario'}</span>
        <ChevronDown className={menuAberto ? `${styles['usuario-chevron']} ${styles.aberto}` : styles['usuario-chevron']} />
      </button>

      {menuAberto && (
        <div className={styles['usuario-popover']} role="menu">
          <button type="button" onClick={sairDaConta}>
            Sair da Conta
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
