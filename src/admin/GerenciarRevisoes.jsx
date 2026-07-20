import { useEffect, useMemo, useState } from 'react'
import styles from './css/GerenciarRevisoes.module.css'
import {
  ArrowLeft,
  ArrowDownNarrowWide,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  Search,
  Wrench,
} from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import { apiRequest } from '../api.js'

const STORAGE_KEY = 'admin.revisoes.veiculos'

const formatarData = (value) => {
  if (!value) {
    return 'Sem revisao'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Sem revisao'
  }

  return date.toLocaleDateString('pt-BR')
}

const nomeDoVeiculo = (veiculo) => (
  veiculo.identification ||
  veiculo.model ||
  veiculo.license_plate ||
  'Veiculo sem identificacao'
)

const carregarRevisoesSalvas = () => {
  try {
    const revisoes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return revisoes && typeof revisoes === 'object' ? revisoes : {}
  } catch {
    return {}
  }
}

function GerenciarRevisoes() {
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [menuAberto, setMenuAberto] = useState(null)
  const [veiculos, setVeiculos] = useState([])
  const [busca, setBusca] = useState('')
  const [revisoes, setRevisoes] = useState(() => carregarRevisoesSalvas())
  const [editorAberto, setEditorAberto] = useState(false)
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState(null)
  const [observacaoEdicao, setObservacaoEdicao] = useState('')
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarVeiculos = async () => {
    try {
      const data = await apiRequest('/api/vehicles')
      setVeiculos(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar veiculos.')
    }
  }

  useEffect(() => {
    carregarVeiculos()
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(revisoes))
  }, [revisoes])

  const revisoesDaTela = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return veiculos
      .map((veiculo) => {
        const revisao = revisoes[veiculo.id] || {}
        const nome = nomeDoVeiculo(veiculo)

        return {
          ...veiculo,
          nome,
          ultimaRevisao: revisao.ultimaRevisao || null,
          observacao: revisao.observacao || '',
        }
      })
      .filter((veiculo) => {
        if (!termo) {
          return true
        }

        const campos = [
          veiculo.nome,
          veiculo.license_plate || '',
          veiculo.driver_name || '',
          veiculo.unit || '',
          veiculo.observacao,
        ]

        return campos.some((campo) => campo.toLowerCase().includes(termo))
      })
  }, [busca, revisoes, veiculos])

  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => (atual === id ? null : id))
  }

  const alternarMenu = (id) => {
    setMenuAberto((atual) => (atual === id ? null : id))
  }

  const abrirEditor = (veiculo) => {
    setMenuAberto(null)
    setVeiculoEmEdicao(veiculo)
    setObservacaoEdicao(veiculo.observacao || '')
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setVeiculoEmEdicao(null)
    setObservacaoEdicao('')
  }

  const salvarObservacao = (event) => {
    event.preventDefault()

    if (!veiculoEmEdicao) {
      return
    }

    const observacao = observacaoEdicao.trim()
    setRevisoes((atual) => ({
      ...atual,
      [veiculoEmEdicao.id]: {
        observacao,
        ultimaRevisao: new Date().toISOString(),
      },
    }))
    showSuccess('Observacao da revisao atualizada.')
    fecharEditor()
  }

  const limparObservacao = (veiculo) => {
    setMenuAberto(null)
    const confirmou = window.confirm(`Deseja limpar a observacao de "${veiculo.nome}"?`)
    if (!confirmou) {
      return
    }

    setRevisoes((atual) => {
      const proximasRevisoes = { ...atual }
      delete proximasRevisoes[veiculo.id]
      return proximasRevisoes
    })
    showSuccess('Observacao removida.')
  }

  return (
    <div className={`${styles['admin-page']} ${styles['admin-page--revisoes']}`}>
      <div className="ui-header">
        <div className={styles['logo']}></div>
        <UserMenu />

        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <Wrench />
            <span>Revisao</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <main className={styles['revisoes-pagina']} onClick={() => setMenuAberto(null)}>
        <section className={`${styles['cadastros']} ${styles['revisoes-cadastros']}`}>
          <div className={`${styles['filtro']} ${styles['revisoes-filtro']}`}>
            <div className={styles['filtro-input-wrap']}>
              <Search className={styles['filtro-icon']} />
              <input
                type="text"
                placeholder="Buscar veiculo..."
                className={styles['filtro-input']}
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <ArrowDownNarrowWide className={styles['icone-filtro']} />
            <p className={styles['busca-filtro']}>Filtrar por...</p>
          </div>
        </section>

        <section className={styles['revisoes-tabela']}>
          <div className={styles['revisoes-cabecalho']}>
            <div className={`${styles['revisoes-coluna']} ${styles['revisoes-coluna--veiculo']}`}>Veiculo</div>
            <div className={`${styles['revisoes-coluna']} ${styles['revisoes-coluna--data']}`}>Ultima Revisao</div>
          </div>

          {revisoesDaTela.length === 0 ? (
            <div className={styles['revisoes-vazio']}>
              Nenhum veiculo cadastrado encontrado.
            </div>
          ) : (
            revisoesDaTela.map((veiculo) => {
              const aberto = veiculoAberto === veiculo.id
              const menuDoVeiculoAberto = menuAberto === veiculo.id

              return (
                <div key={veiculo.id} className={styles['revisoes-bloco']}>
                  <div className={styles['revisoes-linha']}>
                    <button
                      type="button"
                      className={`${styles['revisoes-celula']} ${styles['revisoes-celula--veiculo']}`}
                      onClick={() => alternarVeiculo(veiculo.id)}
                    >
                      {aberto ? (
                        <ChevronDown className={styles['revisoes-seta']} />
                      ) : (
                        <ChevronRight className={styles['revisoes-seta']} />
                      )}
                      <span className={styles['revisoes-nome-veiculo']}>{veiculo.nome}</span>
                    </button>

                    <div className={`${styles['revisoes-celula']} ${styles['revisoes-celula--data']}`}>
                      <span>{formatarData(veiculo.ultimaRevisao)}</span>

                      <div className={styles['revisoes-menu-wrap']} onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className={styles['revisoes-menu-trigger']}
                          aria-label={`Abrir menu de ${veiculo.nome}`}
                          onClick={() => alternarMenu(veiculo.id)}
                        >
                          <EllipsisVertical />
                        </button>

                        {menuDoVeiculoAberto && (
                          <div className={styles['revisoes-menu']}>
                            <button type="button" onClick={() => abrirEditor(veiculo)}>Editar</button>
                            <button type="button" onClick={() => limparObservacao(veiculo)}>Excluir</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {aberto && (
                    <div className={styles['revisoes-detalhe']}>
                      <p>Observacao:</p>
                      <span>{veiculo.observacao || 'Sem observacoes adicionais.'}</span>
                      <p>Placa: {veiculo.license_plate || 'Nao informada'}</p>
                      <p>Motorista: {veiculo.driver_name || 'Nao informado'}</p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </section>
      </main>

      {editorAberto && (
        <div className={styles['revisoes-overlay']} onClick={fecharEditor}>
          <div className={styles['revisoes-popup']} onClick={(event) => event.stopPropagation()}>
            <form className={styles['revisoes-popup-form']} onSubmit={salvarObservacao}>
              <label className={styles['revisoes-popup-label']}>
                Observacao da revisao de {veiculoEmEdicao?.nome}:
                <textarea
                  className={styles['revisoes-popup-textarea']}
                  placeholder="Digite a observacao da revisao"
                  value={observacaoEdicao}
                  onChange={(event) => setObservacaoEdicao(event.target.value)}
                />
              </label>

              <button type="submit" className={styles['revisoes-popup-confirmar']}>
                Confirmar
              </button>
              <button type="button" className={styles['revisoes-popup-cancelar']} onClick={fecharEditor}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GerenciarRevisoes
