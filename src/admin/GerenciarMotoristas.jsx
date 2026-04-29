import { useState } from 'react'
import './css/GerenciarMotoristas.css'
import motorista2 from '../assets/motorista2.png'
import motorista3 from '../assets/motorista3.png'
import { ArrowLeft, ArrowDownNarrowWide, CirclePlus, Users, Search, ChevronDown, ChevronRight } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'


function GerenciarMotoristas() {

  // Informações do banco de dados (linkar o banco de dados aq)
  const [motoristaAberto, setMotoristaAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [passoCadastro, setPassoCadastro] = useState(1)
  const [novoMotorista, setNovoMotorista] = useState({
    nome: '',
    cpf: '',
    rg: '',
    categoriaCnh: '',
    identificacaoTransporte: '',
    contato: '',
    horarios: '',
    unidade: 'Garcia',
  })
  const [acessoMotorista, setAcessoMotorista] = useState({
    email: '',
    senha: '',
    confirmarSenha: '',
  })

  // informações so pra aparecer os elementos na tela enqnt n tem banco de dados
  const motoristas = [
    {
      id: 1,
      nome: 'Motorista 1',
      cpf: '000.000.000-01',
      rg: '12.345.678-9',
      cnh: 'B',
      identificacaoTransporte: 'Linha 01 - Van 12',
      contato: '(19) 90000-0001',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Garcia',
    },
    {
      id: 2,
      nome: 'Motorista 2',
      cpf: '000.000.000-02',
      rg: '98.765.432-1',
      cnh: 'D',
      identificacaoTransporte: 'Linha 02 - Onibus 3',
      contato: '(19) 90000-0002',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 3,
      nome: 'Motorista 3',
      cpf: '000.000.000-03',
      rg: '45.678.912-3',
      cnh: 'B',
      identificacaoTransporte: 'Linha 03 - Van 8',
      contato: '(19) 90000-0003',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Swiss',
    },
    {
      id: 4,
      nome: 'Motorista 4',
      cpf: '000.000.000-04',
      rg: '23.456.789-0',
      cnh: 'D',
      identificacaoTransporte: 'Linha 04 - Onibus 1',
      contato: '(19) 90000-0004',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Garcia',
    },
    {
      id: 5,
      nome: 'Motorista 5',
      cpf: '000.000.000-05',
      rg: '56.789.123-4',
      cnh: 'B',
      identificacaoTransporte: 'Linha 05 - Van 2',
      contato: '(19) 90000-0005',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 6,
      nome: 'Motorista 6',
      cpf: '000.000.000-05',
      rg: '56.789.123-4',
      cnh: 'B',
      identificacaoTransporte: 'Linha 05 - Van 2',
      contato: '(19) 90000-0005',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 7,
      nome: 'Motorista 7',
      cpf: '000.000.000-05',
      rg: '56.789.123-4',
      cnh: 'B',
      identificacaoTransporte: 'Linha 05 - Van 2',
      contato: '(19) 90000-0005',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 8,
      nome: 'Motorista 8',
      cpf: '000.000.000-05',
      rg: '56.789.123-4',
      cnh: 'B',
      identificacaoTransporte: 'Linha 05 - Van 2',
      contato: '(19) 90000-0005',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
  ]

  const alternarMotorista = (id) => {
    setMotoristaAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
    setPassoCadastro(1)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
    setPassoCadastro(1)
  }

  const atualizarCampo = (campo) => (e) => {
    setNovoMotorista((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const enviarNovoMotorista = (e) => {
    e.preventDefault()
    fecharAdicionar()
  }

  const irParaAcesso = () => {
    setPassoCadastro(2)
  }

  const voltarParaDados = () => {
    setPassoCadastro(1)
  }

  const atualizarAcesso = (campo) => (e) => {
    setAcessoMotorista((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  return (
    <main className="admin-page admin-page--motoristas">
      {/* Header principal */}
      <div className="ui-header">
        <div className="logo"></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            {/* Icone do titulo */}
            <img src={motorista3} alt={motorista3} className="ui-header-extra-icon" />
            <span>Motoristas</span>
          </div>
        </div>
      </div>
      {/* Acoes principais */}
      <div className="adicionar">
        <button type="button" className="adicionar-botao" onClick={abrirAdicionar}>
          <CirclePlus id='icone-botao'/>
          Cadastrar Motorista
        </button>
      </div>

      {/* Formulario pop-up */}
      {formularioAberto && (
        <div className="boadd-overlay" onClick={fecharAdicionar}>
          <div
            className="boadd-card"
            onClick={(e) => e.stopPropagation()}
          >
            {passoCadastro === 1 && (
              <div className="boadd-top">
                <div className="boadd-avatar">
                  <img src={motorista2} alt="" />
                </div>
              </div>
            )}

            <form className="boadd-form" onSubmit={enviarNovoMotorista}>
              {passoCadastro === 1 ? (
                <>
                  <input
                    type="text"
                    placeholder="Digite o nome do motorista"
                    value={novoMotorista.nome}
                    onChange={atualizarCampo('nome')}
                  />
                  <input
                    type="text"
                    placeholder="Insira o CPF"
                    value={novoMotorista.cpf}
                    onChange={atualizarCampo('cpf')}
                  />
                  <input
                    type="text"
                    placeholder="Insira o RG"
                    value={novoMotorista.rg}
                    onChange={atualizarCampo('rg')}
                  />
                  <select
                    value={novoMotorista.categoriaCnh}
                    onChange={atualizarCampo('categoriaCnh')}
                  >
                    <option value="">Categoria da CNH</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Veículo / identificação do transporte"
                    value={novoMotorista.identificacaoTransporte}
                    onChange={atualizarCampo('identificacaoTransporte')}
                  />
                  <input
                    type="text"
                    placeholder="Contato"
                    value={novoMotorista.contato}
                    onChange={atualizarCampo('contato')}
                  />
                  <input
                    type="text"
                    placeholder="Horários"
                    value={novoMotorista.horarios}
                    onChange={atualizarCampo('horarios')}
                  />

                  <div className="boadd-unidade">
                    <p>Unidade:</p>
                    <label>
                      <input
                        type="radio"
                        name="unidade"
                        value="Garcia"
                        checked={novoMotorista.unidade === 'Garcia'}
                        onChange={atualizarCampo('unidade')}
                      />
                      Garcia
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="unidade"
                        value="Vila Mimosa"
                        checked={novoMotorista.unidade === 'Vila Mimosa'}
                        onChange={atualizarCampo('unidade')}
                      />
                      Mimosa
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="unidade"
                        value="Swiss Park"
                        checked={novoMotorista.unidade === 'Swiss Park'}
                        onChange={atualizarCampo('unidade')}
                      />
                      Swiss Park
                    </label>
                  </div>

                  <button type="button" className="boadd-confirmar" onClick={irParaAcesso}>
                    Continuar
                  </button>
                  <button type="button" className="boadd-cancelar" onClick={fecharAdicionar}>
                    Cancelar
                  </button>
                </>
              ) : (

                // Apos apertar em continuar
                <>
                  <h2 className="boadd-titulo">Acesso do Motorista</h2>
                  <label className="boadd-label">
                    Informe o e-mail do motorista:
                    <input
                      type="email"
                      placeholder="Email"
                      value={acessoMotorista.email}
                      onChange={atualizarAcesso('email')}
                    />
                  </label>
                  <label className="boadd-label">
                    Crie uma senha:
                    <input
                      type="password"
                      placeholder="Senha"
                      value={acessoMotorista.senha}
                      onChange={atualizarAcesso('senha')}
                    />
                  </label>
                  <label className="boadd-label">
                    Confirme a senha:
                    <input
                      type="password"
                      placeholder="Senha"
                      value={acessoMotorista.confirmarSenha}
                      onChange={atualizarAcesso('confirmarSenha')}
                    />
                  </label>

                  <button type="submit" className="boadd-confirmar">
                    Criar Cadastro
                  </button>
                  <button type="button" className="boadd-voltar" onClick={voltarParaDados}>
                    Voltar
                  </button>
                  <button type="button" className="boadd-cancelar" onClick={fecharAdicionar}>
                    Cancelar
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}


      {/* Lista de motoristas */}
      <div className="cadastros">
        <div className="filtro">
          <div className="filtro-input-wrap">
            <Search className="filtro-icon" />
            <input type="text" placeholder="Buscar motorista" className="filtro-input" />
          </div>
          <ArrowDownNarrowWide className="icone-filtro" /><p className='busca-filtro'>Filtrar Por</p>
        </div>
        

        <div className="motoristas-grid">
          {motoristas.map((motorista) => (
            <div key={motorista.id} className="motorista-item">
              <div
                className={`motorista motorista${motorista.id} ${motoristaAberto === motorista.id ? 'aberto' : ''}`}
                onClick={() => alternarMotorista(motorista.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarMotorista(motorista.id)
                  }
                }}
              >
                {motoristaAberto === motorista.id ? (
                  <ChevronDown className="setinha" />
                ) : (
                  <ChevronRight className="setinha" />
                )}
                <h1>{motorista.nome}</h1>
                <p className="pontinhos">&#8801;</p>
              </div>

              {motoristaAberto === motorista.id && (
                <div className="motorista-detalhes">
                  <div className="motorista-card-top">
                    <div className="motorista-foto" />
                    <div className="motorista-info">
                      <p><strong>CPF:</strong> {motorista.cpf}</p>
                      <p><strong>RG:</strong> {motorista.rg}</p>
                      <p><strong>CNH:</strong> {motorista.cnh}</p>
                      <p><strong>Veiculo:</strong> {motorista.identificacaoTransporte}</p>
                    </div>
                  </div>
                  <div className="motorista-info-extra">
                    <p><strong>Contato:</strong> {motorista.contato}</p>
                    <p><strong>Horarios:</strong> {motorista.horarios}</p>
                    <p><strong>Unidade:</strong> {motorista.unidade}</p>
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

export default GerenciarMotoristas
