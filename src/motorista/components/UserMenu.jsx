import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import user from '../../assets/place-user.png'

function UserMenu() {
  const [menuAberto, setMenuAberto] = useState(false)
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
    window.location.href = '/'
  }

  return (
    <div className="usuario" ref={menuRef}>
      <button
        type="button"
        className="usuario-trigger"
        onClick={() => setMenuAberto((atual) => !atual)}
        aria-haspopup="menu"
        aria-expanded={menuAberto}
      >
        <img src={user} alt="Usuario" />
        <span className="usuario-nome">Usuario</span>
        <ChevronDown className={`usuario-chevron ${menuAberto ? 'aberto' : ''}`} />
      </button>

      {menuAberto && (
        <div className="usuario-popover" role="menu">
          <button type="button" onClick={sairDaConta}>
            Sair da Conta
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
