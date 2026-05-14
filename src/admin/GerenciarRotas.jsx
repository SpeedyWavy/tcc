import { useState } from 'react'
import './css/GerenciarRotas.css'
import {
  ArrowLeft,
  ArrowDownNarrowWide,
  CircleCheckBig,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  Map,
  Search,
  TriangleAlert,
} from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'

function GerenciarRotas() {
  // Informações do banco de dados (linkar o banco de dados aq)
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [rotaAberta, setRotaAberta] = useState(null)
  const [menuAberto, setMenuAberto] = useState(null)
  const { notification, showError, clearNotification } = useActionNotification()

  // Constantes identificando cada veiculo e sua devida rota
  const veiculos = [
    {
      id: 1,
      nome: 'Veiculo 1',
      rotas: [
        {
          id: '1-rota-1',
          nome: 'Rota 1',
          status: 'Atrasado',
          alunos: ['Aluno 1', 'Aluno 2', 'Aluno 3'],
        },
        {
          id: '1-rota-2',
          nome: 'Rota 2',
          status: 'Aguardando Saida',
          alunos: ['Aluno 4', 'Aluno 5'],
        },
      ],
    },
    {
      id: 2,
      nome: 'Veiculo 2',
      rotas: [
        {
          id: '2-rota-1',
          nome: 'Rota 1',
          status: 'Em Transito',
          alunos: ['Aluno 6', 'Aluno 7'],
        },
        {
          id: '2-rota-2',
          nome: 'Rota 2',
          status: 'Aguardando Saida',
          alunos: ['Aluno 8', 'Aluno 9'],
        },
      ],
    },
    {
      id: 3,
      nome: 'Veiculo 3',
      rotas: [
        {
          id: '3-rota-1',
          nome: 'Rota 1',
          status: 'Aguardando Saida',
          alunos: ['Aluno 10', 'Aluno 11'],
        },
      ],
    },
    {
      id: 4,
      nome: 'Veiculo 4',
      rotas: [
        {
          id: '4-rota-1',
          nome: 'Rota 1',
          status: 'Concluido',
          alunos: ['Aluno 12', 'Aluno 13'],
        },
        {
          id: '4-rota-2',
          nome: 'Rota 2',
          status: 'Em Transito',
          alunos: ['Aluno 14', 'Aluno 15'],
        },
      ],
    },
    {
      id: 5,
      nome: 'Veiculo 5',
      rotas: [
        {
          id: '5-rota-1',
          nome: 'Rota 1',
          status: 'Concluido',
          alunos: ['Aluno 16', 'Aluno 17'],
        },
        {
          id: '5-rota-2',
          nome: 'Rota 2',
          status: 'Concluido',
          alunos: ['Aluno 18', 'Aluno 19'],
        },
      ],
    },
    {
      id: 6,
      nome: 'Veiculo 6',
      rotas: [
        {
          id: '6-rota-1',
          nome: 'Rota 1',
          status: 'Em Transito',
          alunos: ['Aluno 20', 'Aluno 21'],
        },
      ],
    },
    {
      id: 7,
      nome: 'Veiculo 7',
      rotas: [
        {
          id: '7-rota-1',
          nome: 'Rota 1',
          status: 'Aguardando Saida',
          alunos: ['Aluno 22', 'Aluno 23'],
        },
      ],
    },
    {
      id: 8,
      nome: 'Veiculo 8',
      rotas: [
        {
          id: '8-rota-1',
          nome: 'Rota 1',
          status: 'Concluido',
          alunos: ['Aluno 24', 'Aluno 25'],
        },
        {
          id: '8-rota-2',
          nome: 'Rota 2',
          status: 'Aguardando Saida',
          alunos: ['Aluno 26', 'Aluno 27'],
        },
      ],
    },
    {
      id: 9,
      nome: 'Veiculo 9',
      rotas: [
        {
          id: '9-rota-1',
          nome: 'Rota 1',
          status: 'Atrasado',
          alunos: ['Aluno 28', 'Aluno 29'],
        },
      ],
    },
  ]

  // Abre e fecha o veiculo, garantindo que ao abrir um novo, o outro seja fechado
  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => {
      const proximo = atual === id ? null : id

      if (proximo !== id) {
        setRotaAberta(null)
      }

      return proximo
    })
  }

  // Abre e fecha a rota
  const alternarRota = (id) => {
    setRotaAberta((atual) => (atual === id ? null : id))
  }

  // Abre e fecha o menu de opções
  const alternarMenu = (id) => {
    setMenuAberto((atual) => (atual === id ? null : id))
  }

  // Obtem o Status do Veiculo, verificando o status de suas rotas e retornando o mais crítico
  const obterStatusGeral = (rotas) => {
    const primeiraRotaPendente = rotas.find((rota) => rota.status !== 'Concluido')
    return primeiraRotaPendente ? primeiraRotaPendente.status : 'Concluido'
  }

  // mostra o Status do veiculo com a cor correspondente
  const renderizarStatus = (status) => {
    const classeStatus = status.toLowerCase().replace(/\s+/g, '-')

    return (
      <span className={`rotas-status rotas-status--${classeStatus}`}>
        {status === 'Atrasado' && <TriangleAlert className="rotas-status-alerta" />}
        {status === 'Concluido' && <CircleCheckBig className="rotas-status-check" />}
        {status}
      </span>
    )
  }

  const notificarErro = (mensagem) => {
    showError(mensagem)
    setMenuAberto(null)
  }

  return (
    <div className="admin-page admin-page--rotas">
      {/* Header da pagina */}
      <div className="ui-header">
        <div className="logo"></div>
        <UserMenu />

        {/* Botão para voltar para app.jsx */}
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <Map />
            <span>Rotas</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      {/* Parte principal com cada veiculo listado e a Const para abrir cada veiculo e ver sua rota */}
      <main className="rotas-pagina" onClick={() => setMenuAberto(null)}>
        <section className="cadastros rotas-cadastros">
          {/* Barra de pesquisa e filtro */}
          <div className="filtro rotas-filtro">
            <div className="filtro-input-wrap">
              <Search className="filtro-icon" />
              <input type="text" placeholder="Buscar rota" className="filtro-input" />
            </div>
            <ArrowDownNarrowWide className="icone-filtro" />
            <p className="busca-filtro">Filtrar Por</p>
          </div>
        </section>

        {/* Tabela com rotas dos veiculos */}
        <section className="rotas-tabela">
          <div className="rotas-cabecalho">
            <div className="rotas-coluna rotas-coluna--veiculo">Veiculo</div>
            <div className="rotas-coluna rotas-coluna--status">Status</div>
          </div>

          {/* Utilização da constante para abrir cada informação dos veiculos */}
          {veiculos.map((veiculo) => {
            const aberto = veiculoAberto === veiculo.id
            const menuVeiculoAberto = menuAberto === veiculo.id
            const statusGeral = obterStatusGeral(veiculo.rotas)

            // Cada rota de veiculo mostrado aq juntamente do status
            return (
              <div key={veiculo.id} className="rotas-bloco">
                <div className="rotas-linha">
                  <button
                    type="button"
                    className="rotas-celula rotas-celula--veiculo"
                    onClick={() => alternarVeiculo(veiculo.id)}
                  >
                    {aberto ? (
                      <ChevronDown className="rotas-seta" />
                    ) : (
                      <ChevronRight className="rotas-seta" />
                    )}
                    <span className="rotas-nome-veiculo">{veiculo.nome}</span>
                  </button>

                  <div className="rotas-celula rotas-celula--status">
                    {renderizarStatus(statusGeral)}

                    <div className="rotas-menu-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="rotas-menu-trigger"
                        aria-label={`Abrir menu de ${veiculo.nome}`}
                        onClick={() => alternarMenu(veiculo.id)}
                      >
                        <EllipsisVertical />
                      </button>

                      {/* Menu para editar ou excluir a rota ao apertar nos 3 pontinhos */}
                      {menuVeiculoAberto && (
                        <div className="rotas-menu">
                          <button type="button" onClick={() => notificarErro('Erro ao editar cadastro.')}>Editar</button>
                          <button type="button" onClick={() => notificarErro('Erro ao excluir cadastro.')}>Excluir</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {aberto && veiculo.rotas.map((rota) => {
                  const menuRotaAberto = menuAberto === rota.id
                  const rotaExpandida = rotaAberta === rota.id

                  return (
                    <div key={rota.id} className="rotas-subgrupo">
                      <div className="rotas-linha rotas-linha--filha">
                        <button
                          type="button"
                          className="rotas-celula rotas-celula--veiculo rotas-celula--rota"
                          onClick={() => alternarRota(rota.id)}
                        >
                          {rotaExpandida ? (
                            <ChevronDown className="rotas-seta" />
                          ) : (
                            <ChevronRight className="rotas-seta" />
                          )}
                          <span className="rotas-nome-veiculo">{rota.nome}</span>
                        </button>

                        <div className="rotas-celula rotas-celula--status">
                          {renderizarStatus(rota.status)}

                          <div className="rotas-menu-wrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="rotas-menu-trigger"
                              aria-label={`Abrir menu de ${rota.nome}`}
                              onClick={() => alternarMenu(rota.id)}
                            >
                              <EllipsisVertical />
                            </button>

                            {menuRotaAberto && (
                              <div className="rotas-menu">
                                <button type="button" onClick={() => notificarErro('Erro ao editar cadastro.')}>Editar</button>
                                <button type="button" onClick={() => notificarErro('Erro ao excluir cadastro.')}>Excluir</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {rotaExpandida && (
                        <div className="rotas-alunos">
                          {rota.alunos.map((aluno) => (
                            <p key={aluno}>{aluno}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default GerenciarRotas
