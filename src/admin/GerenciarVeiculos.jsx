import { useState } from 'react'
import './css/GerenciarVeiculos.css'
import { ArrowLeft, ArrowDownNarrowWide, Bus, CirclePlus, Search, ChevronRight, ChevronDown } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'

function GerenciarVeiculos() {
  // Informações do banco de dados (linkar o banco de dados aq)
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [novoVeiculo, setNovoVeiculo] = useState({
    placa: '',
    identificacao: '',
    motoristaResp: '',
    capacidadeTotal: '',
    passageirosAtual: '',
    ultimaRevisao: '',
    observacaoRevisao: '',
    unidade: 'Garcia',
  })
  const { notification, showError, clearNotification } = useActionNotification()

  // informações so pra aparecer os elementos na tela enqnt n tem banco de dados
  const veiculos = [
    {
      id: 1,
      nome: 'Veiculo 01',
      placa: 'ABC-1D23',
      identificacao: 'Linha 01 - Van 3',
      capacidadeTotal: '15 passageiros',
      passageirosAtual: '11 passageiros',
      ultimaRevisao: '10/04/2026',
      observacaoRevisao: 'Troca de oleo e verificacao dos freios.',
      unidade: 'Unidade Garcia',
    },
    {
      id: 2,
      nome: 'Veiculo 02',
      placa: 'EFG-4H56',
      identificacao: 'Linha 02 - Onibus 2',
      capacidadeTotal: '42 passageiros',
      passageirosAtual: '36 passageiros',
      ultimaRevisao: '03/04/2026',
      observacaoRevisao: 'Revisao preventiva concluida sem pendencias.',
      unidade: 'Unidade Garcia',
    },
    {
      id: 3,
      nome: 'Veiculo 03',
      placa: 'IJK-7L89',
      identificacao: 'Linha 03 - Van 1',
      capacidadeTotal: '15 passageiros',
      passageirosAtual: '13 passageiros',
      ultimaRevisao: '28/03/2026',
      observacaoRevisao: 'Pneus traseiros substituidos.',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 4,
      nome: 'Veiculo 04',
      placa: 'MNO-1P23',
      identificacao: 'Linha 04 - Onibus 5',
      capacidadeTotal: '46 passageiros',
      passageirosAtual: '40 passageiros',
      ultimaRevisao: '15/03/2026',
      observacaoRevisao: 'Necessario acompanhar desgaste das pastilhas.',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 5,
      nome: 'Veiculo 05',
      placa: 'QRS-4T56',
      identificacao: 'Linha 05 - Van 2',
      capacidadeTotal: '18 passageiros',
      passageirosAtual: '14 passageiros',
      ultimaRevisao: '08/04/2026',
      observacaoRevisao: 'Ar-condicionado revisado e higienizado.',
      unidade: 'Unidade Swiss',
    },
  ]

  // Abre e fecha o veiculo, garantindo que ao abrir um novo, o outro seja fechado
  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => (atual === id ? null : id))
  }

  // Abre o formulario para adicionar novo veiculo
  const abrirAdicionar = () => {
    setFormularioAberto(true)
  }

  // Fecha o formulario
  const fecharAdicionar = () => {
    setFormularioAberto(false)
  }

  // Atualiza cada campo do formulario
  const atualizarCampo = (campo) => (e) => {
    setNovoVeiculo((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  // Envia o novo veiculo (validar com backend)
  const enviarNovoVeiculo = (e) => {
    e.preventDefault()
    showError('Erro ao cadastrar veiculo.')
    fecharAdicionar()
  }

  return (
    <main className="admin-page admin-page--veiculos">
      {/* Header principal */}
      <div className="ui-header">
        <div className="logo"></div>
        <UserMenu />
        <div className="ui-header-extra">
          {/* Botão para voltar para app.jsx */}
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            {/* Icone do titulo */}
            <Bus />
            <span>Veiculos</span>
          </div>
        </div>
      </div>

      {/* Ações principais */}
      <ActionNotification notification={notification} onClose={clearNotification} />

      <div className="adicionar">
        <button type="button" className="adicionar-botao" onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Veiculo
        </button>
      </div>

      {/* Pop-up do formulario */}
      {formularioAberto && (
        <div className="boadd-overlay" onClick={fecharAdicionar}>
          <div
            className="boadd-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="boadd-top"></div>

            <form className="boadd-form" onSubmit={enviarNovoVeiculo}>
              <p className="boadd-label">Placa</p>
              <input
                type="text"
                placeholder="Digite a placa do veiculo"
                value={novoVeiculo.placa}
                onChange={atualizarCampo('placa')}
              />

              <p className="boadd-label">Identificacao</p>
              <input
                type="text"
                placeholder="Numero de identificacao do veiculo"
                value={novoVeiculo.identificacao}
                onChange={atualizarCampo('identificacao')}
              />

              <p className="boadd-label">Motorista</p>
              <input
                type="text"
                placeholder="Motorista responsavel"
                value={novoVeiculo.motoristaResp}
                onChange={atualizarCampo('motoristaResp')}
              />

              <p className="boadd-label">Capacidade</p>
              <input
                type="text"
                placeholder="Capacidade total"
                value={novoVeiculo.capacidadeTotal}
                onChange={atualizarCampo('capacidadeTotal')}
              />

              <p className="boadd-label">Unidade de atuacão</p>
              <div className="boadd-unidade">
                <p className="boadd-unidade-titulo">Unidade:</p>
                <label>
                  <input
                    type="radio"
                    name="unidade"
                    value="Garcia"
                    checked={novoVeiculo.unidade === 'Garcia'}
                    onChange={atualizarCampo('unidade')}
                  />
                  Garcia
                </label>
                <label>
                  <input
                    type="radio"
                    name="unidade"
                    value="Vila Mimosa"
                    checked={novoVeiculo.unidade === 'Vila Mimosa'}
                    onChange={atualizarCampo('unidade')}
                  />
                  Vila Mimosa
                </label>
                <label>
                  <input
                    type="radio"
                    name="unidade"
                    value="Swiss Park"
                    checked={novoVeiculo.unidade === 'Swiss Park'}
                    onChange={atualizarCampo('unidade')}
                  />
                  Swiss Park
                </label>
              </div>

              <button type="submit" className="boadd-confirmar">
                Criar Cadastro
              </button>
              <button type="button" className="boadd-cancelar" onClick={fecharAdicionar}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lista de veiculos */}
      <div className="cadastros">
        {/* Barra de pesquisa e filtro */}
        <div className="filtro">
          <div className="filtro-input-wrap">
            <Search className="filtro-icon" />
            <input type="text" placeholder="Buscar veiculo" className="filtro-input" />
          </div>
          <ArrowDownNarrowWide className="icone-filtro" />
          <p className="busca-filtro">Filtrar Por</p>
        </div>

        {/* Grid com cards dos veiculos */}
        <div className="alunos-grid">
          {veiculos.map((veiculo) => (
            <div key={veiculo.id} className="aluno-item">
              <div
                className={`aluno aluno${veiculo.id} ${veiculoAberto === veiculo.id ? 'aberto' : ''}`}
                onClick={() => alternarVeiculo(veiculo.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarVeiculo(veiculo.id)
                  }
                }}
              >
                {veiculoAberto === veiculo.id ? (
                  <ChevronDown className="setinha" />
                ) : (
                  <ChevronRight className="setinha" />
                )}
                <h1>{veiculo.nome}</h1>
                <p className="pontinhos">&#8801;</p>
              </div>

              {veiculoAberto === veiculo.id && (
                <div className="aluno-detalhes">
                  <div className="aluno-info">
                    <p><strong>Placa:</strong> {veiculo.placa}</p>
                    <p><strong>Identificacao do Veiculo:</strong> {veiculo.identificacao}</p>
                    <p><strong>Capacidade Total:</strong> {veiculo.capacidadeTotal}</p>
                    <p><strong>Numero de Passageiros Atual:</strong> {veiculo.passageirosAtual}</p>
                    <p><strong>Ultima Revisao:</strong> {veiculo.ultimaRevisao}</p>
                    <p><strong>Observacao da Revisao:</strong> {veiculo.observacaoRevisao}</p>
                    <p><strong>Unidade:</strong> {veiculo.unidade}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default GerenciarVeiculos
