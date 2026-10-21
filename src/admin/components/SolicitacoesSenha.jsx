import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import styles from './SolicitacoesSenha.module.css'
import { chamarSuporteSenha } from '../../lib/suporteSenha.js'
import ActionNotification, { useActionNotification } from './ActionNotification.jsx'
import { traduzirMensagemUsuario } from '../../lib/traduzirMensagemUsuario.js'

function dataSolicitacao(value) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SolicitacoesSenha() {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [solicitacaoAtiva, setSolicitacaoAtiva] = useState('')
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [processando, setProcessando] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregar = useCallback(async () => {
    setCarregando(true)
    setFeedback('')
    try {
      const resultado = await chamarSuporteSenha({ action: 'list' })
      setSolicitacoes(resultado.requests || [])
    } catch (error) {
      setFeedback(traduzirMensagemUsuario(error.message, 'Não foi possivel carregar as solicitações.'))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const redefinirSenha = async (event) => {
    event.preventDefault()
    if (!solicitacaoAtiva || processando) return
    if (novaSenha.length < 3) {
      setFeedback('A nova senha deve ter pelo menos 3 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setFeedback('A confirmação da nova senha não corresponde.')
      return
    }

    setProcessando(true)
    setFeedback('')
    try {
      const resultado = await chamarSuporteSenha({
        action: 'resolve',
        request_id: solicitacaoAtiva,
        admin_password: senhaAdmin,
        new_password: novaSenha,
      })
      setFeedback('')
      setSolicitacaoAtiva('')
      setSenhaAdmin('')
      setNovaSenha('')
      setConfirmarSenha('')
      await carregar()
      showSuccess('Senha alterada com sucesso.')
    } catch (error) {
      const mensagem = traduzirMensagemUsuario(error.message, 'Não foi possivel redefinir a senha.')
      setFeedback(mensagem)
      showError(mensagem)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <section className={`${styles.card} mais-card`}>
      <header className={styles.header}>
        <div>
          <h2>Solicitações de senha</h2>
          <p>Redefina a senha dos motoristas que pediram uma redefinição pela página de suporte.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={carregar} disabled={carregando} aria-label="Atualizar solicitações">
          <RefreshCw size={18} /> Atualizar
        </button>
      </header>

      {feedback && <p className={styles.feedback} role="status">{feedback}</p>}
      {carregando ? <p>Carregando solicitações...</p> : null}
      {!carregando && solicitacoes.length === 0 ? <p className={styles.vazio}>Nenhuma solicitação pendente.</p> : null}

      <div className={styles.lista}>
        {solicitacoes.map((item) => (
          <article key={item.id} className={styles.item}>
            <div className={styles.detalhes}>
              <strong>{item.driver_name}</strong>
              <span>{item.driver_email}</span>
              {item.unit && <span>Unidade: {item.unit}</span>}
              <time dateTime={item.created_at}>Solicitado em {dataSolicitacao(item.created_at)}</time>
            </div>
            <button type="button" className={styles.acao} onClick={() => {
              setSolicitacaoAtiva((atual) => atual === item.id ? '' : item.id)
              setFeedback('')
            }}>
              <KeyRound size={17} /> {solicitacaoAtiva === item.id ? 'Cancelar' : 'Redefinir senha'}
            </button>

            {solicitacaoAtiva === item.id && (
              <form className={styles.formulario} onSubmit={redefinirSenha}>
                <label>
                  Sua senha atual de administrador
                  <span className={styles.senhaCampo}>
                    <input type={mostrarSenhaAdmin ? 'text' : 'password'} autoComplete="current-password" required value={senhaAdmin} onChange={(event) => setSenhaAdmin(event.target.value)} disabled={processando} />
                    <button type="button" className={styles.mostrarSenha} onClick={() => setMostrarSenhaAdmin((atual) => !atual)} aria-label={mostrarSenhaAdmin ? 'Ocultar senha do administrador' : 'Mostrar senha do administrador'} aria-pressed={mostrarSenhaAdmin}>
                      {mostrarSenhaAdmin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                <label>
                  Nova senha do motorista
                  <span className={styles.senhaCampo}>
                    <input type={mostrarNovaSenha ? 'text' : 'password'} autoComplete="new-password" minLength={3} required value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} disabled={processando} />
                    <button type="button" className={styles.mostrarSenha} onClick={() => setMostrarNovaSenha((atual) => !atual)} aria-label={mostrarNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'} aria-pressed={mostrarNovaSenha}>
                      {mostrarNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                <label>
                  Confirme a nova senha
                  <span className={styles.senhaCampo}>
                    <input type={mostrarConfirmacao ? 'text' : 'password'} autoComplete="new-password" minLength={3} required value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} disabled={processando} />
                    <button type="button" className={styles.mostrarSenha} onClick={() => setMostrarConfirmacao((atual) => !atual)} aria-label={mostrarConfirmacao ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={mostrarConfirmacao}>
                      {mostrarConfirmacao ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                <button type="submit" className={styles.confirmar} disabled={processando}>
                  {processando ? 'Verificando e salvando...' : 'Confirmar alteração'}
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
      <ActionNotification notification={notification} onClose={clearNotification} />
    </section>
  )
}
