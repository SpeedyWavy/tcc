import { useState } from 'react'
import './css/GerenciarRevisoes.css'
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

function GerenciarRevisoes() {
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [menuAberto, setMenuAberto] = useState(null)
  const { notification, showError, clearNotification } = useActionNotification()
  const [revisoes] = useState([
    {
      id: 1,
      nome: 'Veiculo 1',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 2,
      nome: 'Veiculo 2',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 3,
      nome: 'Veiculo 3',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 4,
      nome: 'Veiculo 4',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 5,
      nome: 'Veiculo 5',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 6,
      nome: 'Veiculo 6',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 7,
      nome: 'Veiculo 7',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 8,
      nome: 'Veiculo 8',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 9,
      nome: 'Veiculo 9',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
    {
      id: 10,
      nome: 'Veiculo 10',
      ultimaRevisao: '01/01/2026',
      observacao: '',
    },
  ])

  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => (atual === id ? null : id))
  }

  const alternarMenu = (id) => {
    setMenuAberto((atual) => (atual === id ? null : id))
  }

  const notificarErro = (mensagem) => {
    showError(mensagem)
    setMenuAberto(null)
  }

  return (
    <div className="admin-page admin-page--revisoes">
      <div className="ui-header">
        <div className="logo"></div>
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

      <main className="revisoes-pagina" onClick={() => setMenuAberto(null)}>
        <section className="cadastros revisoes-cadastros">
          <div className="filtro revisoes-filtro">
            <div className="filtro-input-wrap">
              <Search className="filtro-icon" />
              <input type="text" placeholder="Buscar veiculo..." className="filtro-input" />
            </div>
            <ArrowDownNarrowWide className="icone-filtro" />
            <p className="busca-filtro">Filtrar por...</p>
          </div>
        </section>

        <section className="revisoes-tabela">
          <div className="revisoes-cabecalho">
            <div className="revisoes-coluna revisoes-coluna--veiculo">Veiculo</div>
            <div className="revisoes-coluna revisoes-coluna--data">Ultima Revisao</div>
          </div>

          {revisoes.map((veiculo) => {
            const aberto = veiculoAberto === veiculo.id
            const menuDoVeiculoAberto = menuAberto === veiculo.id

            return (
              <div key={veiculo.id} className="revisoes-bloco">
                <div className="revisoes-linha">
                  <button
                    type="button"
                    className="revisoes-celula revisoes-celula--veiculo"
                    onClick={() => alternarVeiculo(veiculo.id)}
                  >
                    {aberto ? (
                      <ChevronDown className="revisoes-seta" />
                    ) : (
                      <ChevronRight className="revisoes-seta" />
                    )}
                    <span className="revisoes-nome-veiculo">{veiculo.nome}</span>
                  </button>

                  <div className="revisoes-celula revisoes-celula--data">
                    <span>{veiculo.ultimaRevisao}</span>

                    <div className="revisoes-menu-wrap" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="revisoes-menu-trigger"
                        aria-label={`Abrir menu de ${veiculo.nome}`}
                        onClick={() => alternarMenu(veiculo.id)}
                      >
                        <EllipsisVertical />
                      </button>

                      {menuDoVeiculoAberto && (
                        <div className="revisoes-menu">
                          <button type="button" onClick={() => notificarErro('Erro ao editar cadastro.')}>Editar</button>
                          <button type="button" onClick={() => notificarErro('Erro ao excluir cadastro.')}>Excluir</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {aberto && (
                  <div className="revisoes-detalhe">
                    <p>Observacao:</p>
                    <span>{veiculo.observacao || 'Sem observacoes adicionais.'}</span>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </main>

    </div>
  )
}

export default GerenciarRevisoes
