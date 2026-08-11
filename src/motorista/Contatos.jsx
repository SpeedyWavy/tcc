import { useEffect, useMemo, useState } from 'react'
import styles from './css/Contatos.module.css'
import { ArrowLeft, Phone, PhoneCall, Search } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import { apiRequest } from '../api.js'

function normalizarContato(contato) {
  return {
    id: contato.id,
    nome: contato.full_name || '',
    role: contato.role || '',
    telefone: contato.contact || contato.phone || '',
    email: contato.email || '',
    unidade: contato.unit || '',
    transporte: contato.transport_identification || '',
    cpf: contato.cpf || '',
  }
}

function Contatos() {
  const [busca, setBusca] = useState('')
  const [contatos, setContatos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    const carregarContatos = async () => {
      setCarregando(true)
      setErro('')

      try {
        const data = await apiRequest('/api/contacts')
        if (!ativo) {
          return
        }

        setContatos(Array.isArray(data) ? data.map(normalizarContato) : [])
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Erro ao carregar contatos.')
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarContatos()

    return () => {
      ativo = false
    }
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return contatos.filter((contato) => {
      const ehAdmin = contato.role === 'admin'
      const passaBusca =
        !termo ||
        [
          contato.nome,
          contato.telefone,
          contato.email,
          contato.unidade,
          contato.cpf,
        ]
          .join(' ')
          .toLowerCase()
          .includes(termo)

      return ehAdmin && passaBusca
    })
  }, [busca, contatos])

  const grupos = useMemo(() => {
    return [
      { titulo: 'Administradores', itens: filtrados },
    ]
  }, [filtrados])

  return (
    <main className={styles['motorista-contatos-page']}>
      <div className="ui-header">
        <div className={styles['logo']} />
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <Phone className={styles['ui-header-extra-icon']} />
            <span>Contatos</span>
          </div>
        </div>
      </div>

      <section className={styles['conteudo']}>
        <div className={styles['barra-pesquisa']}>
          <Search className={styles['icone-pesquisa']} />
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {carregando ? <p className={styles['estado']}>Carregando contatos...</p> : null}
        {erro ? <p className={styles['estado']}>{erro}</p> : null}

        {!carregando && !erro ? (
          <div className={styles['lista']}>
            {grupos.map((grupo) => (
              <section key={grupo.titulo} className={styles['grupo']}>
                <h2>{grupo.titulo}</h2>

                {grupo.itens.length === 0 ? (
                  <p className={styles['vazio']}>Nenhum contato encontrado.</p>
                ) : (
                  grupo.itens.map((contato) => (
                    <article key={contato.id} className={styles['contato']}>
                      <div className={styles['contato-info']}>
                        <strong>{contato.nome}</strong>
                        <span>{contato.telefone || 'Sem telefone cadastrado'}</span>
                      </div>

                      <div className={styles['acoes']}>
                        <button type="button" className={styles['acao']} disabled={!contato.telefone} title="Ligar">
                          <Phone />
                        </button>
                        <button type="button" className={styles['acao']} disabled={!contato.telefone} title="Ligar">
                          <PhoneCall />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default Contatos

// 
