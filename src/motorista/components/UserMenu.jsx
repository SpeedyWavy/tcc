import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown } from 'lucide-react'
import user from '../../assets/place-user.png'
import { clearSession, getStoredUser } from '../../auth.js'
import { getModoEscuro, aplicarModoEscuro } from '../../lib/preferenciasMotorista.js'
import ConfiguracoesModal from './ConfiguracoesModal.jsx'
import styles from './UserMenu.module.css'
import { supabase } from '../../supabase.js'
import HistoricoNotificacoes from '../../components/HistoricoNotificacoes.jsx'

function UserMenu() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [usuarioLogado] = useState(() => getStoredUser())
  const [fotoPerfil, setFotoPerfil] = useState(() => usuarioLogado?.photo_url || null)
  const menuRef = useRef(null)

  useEffect(() => {
    aplicarModoEscuro(getModoEscuro())
  }, [])

  useEffect(() => {
    let ativo = true

    const carregarFotoPerfil = async () => {
      if (!usuarioLogado?.id) return

      const { data, error } = await supabase
        .from('users')
        .select('photo_url')
        .eq('id', usuarioLogado.id)
        .maybeSingle()

      if (!error && ativo && data?.photo_url) {
        setFotoPerfil(data.photo_url)
      }
    }

    carregarFotoPerfil()
    return () => { ativo = false }
  }, [usuarioLogado?.id])

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

  const abrirConfiguracoes = () => {
    setMenuAberto(false)
    setConfiguracoesAbertas(true)
  }

  const abrirHistorico = () => {
    setMenuAberto(false)
    setHistoricoAberto(true)
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
        <img
          src={fotoPerfil || user}
          alt={fotoPerfil ? `Foto de ${usuarioLogado?.full_name || 'usuário'}` : 'Usuário'}
          onError={() => setFotoPerfil(null)}
        />
        <span className={styles['usuario-nome']}>{usuarioLogado?.full_name || 'Usuário'}</span>
        <ChevronDown className={menuAberto ? `${styles['usuario-chevron']} ${styles.aberto}` : styles['usuario-chevron']} />
      </button>

      {menuAberto && (
        <div className={styles['usuario-popover']} role="menu">
          <button type="button" role="menuitem" onClick={abrirHistorico}>
            <Bell size={17} /> Notificacoes anteriores
          </button>
          <button type="button" onClick={abrirConfiguracoes}>
            Configuracoes
          </button>
          <button type="button" onClick={sairDaConta}>
            Sair da Conta
          </button>
        </div>
      )}

      {configuracoesAbertas && <ConfiguracoesModal onClose={() => setConfiguracoesAbertas(false)} />}
      {historicoAberto && <HistoricoNotificacoes onClose={() => setHistoricoAberto(false)} />}
    </div>
  )
}

export default UserMenu

//
