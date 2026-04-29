import { useState } from 'react'
import './css/GerenciarAdministradores.css'
import { ArrowLeft, ArrowDownNarrowWide, CirclePlus, Search, ChevronDown, ChevronRight, Users } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'

function GerenciarAdministradores() {
  const [administradorAberto, setAdministradorAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [novoAdministrador, setNovoAdministrador] = useState({
    nome: '',
    cpf: '',
    email: '',
  })

  const administradores = [
    {
      id: 1,
      nome: 'Administrador 01',
      cpf: '000.000.000-01',
      email: 'admin01@rds.com',
    },
    {
      id: 2,
      nome: 'Administrador 02',
      cpf: '000.000.000-02',
      email: 'admin02@rds.com',
    },
    {
      id: 3,
      nome: 'Administrador 03',
      cpf: '000.000.000-03',
      email: 'admin03@rds.com',
    },
    {
      id: 4,
      nome: 'Administrador 04',
      cpf: '000.000.000-04',
      email: 'admin04@rds.com',
    },
    {
      id: 5,
      nome: 'Administrador 05',
      cpf: '000.000.000-05',
      email: 'admin05@rds.com',
    },
  ]

  const alternarAdministrador = (id) => {
    setAdministradorAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
  }

  const atualizarCampo = (campo) => (e) => {
    setNovoAdministrador((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const enviarNovoAdministrador = (e) => {
    e.preventDefault()
    fecharAdicionar()
  }

  return (
    <main className="admin-page admin-page--administradores">
      <div className="ui-header">
        <div className="logo"></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <Users />
            <span>Administradores</span>
          </div>
        </div>
      </div>

      <div className="adicionar">
        <button type="button" className="adicionar-botao" onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Administrador
        </button>
      </div>

      {formularioAberto && (
        <div className="boadd-overlay" onClick={fecharAdicionar}>
          <div
            className="boadd-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="boadd-top"></div>

            <form className="boadd-form" onSubmit={enviarNovoAdministrador}>
              <p className="boadd-label">Nome Completo</p>
              <input
                type="text"
                placeholder="Digite o nome do administrador"
                value={novoAdministrador.nome}
                onChange={atualizarCampo('nome')}
              />

              <p className="boadd-label">Cpf</p>
              <input
                type="text"
                placeholder="Insira o CPF do administrador"
                value={novoAdministrador.cpf}
                onChange={atualizarCampo('cpf')}
              />

              <p className="boadd-label">Email</p>
              <input
                type="email"
                placeholder="Informe o email do administrador"
                value={novoAdministrador.email}
                onChange={atualizarCampo('email')}
              />

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

      <div className="cadastros">
        <div className="filtro">
          <div className="filtro-input-wrap">
            <Search className="filtro-icon" />
            <input type="text" placeholder="Buscar administrador" className="filtro-input" />
          </div>
          <ArrowDownNarrowWide className="icone-filtro" />
          <p className="busca-filtro">Filtrar Por</p>
        </div>

        <div className="alunos-grid">
          {administradores.map((administrador) => (
            <div key={administrador.id} className="aluno-item">
              <div
                className={`aluno aluno${administrador.id} ${administradorAberto === administrador.id ? 'aberto' : ''}`}
                onClick={() => alternarAdministrador(administrador.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarAdministrador(administrador.id)
                  }
                }}
              >
                {administradorAberto === administrador.id ? (
                  <ChevronDown className="setinha" />
                ) : (
                  <ChevronRight className="setinha" />
                )}
                <h1>{administrador.nome}</h1>
                <p className="pontinhos">&#8801;</p>
              </div>

              {administradorAberto === administrador.id && (
                <div className="aluno-detalhes">
                  <div className="aluno-info">
                    <p><strong>Nome:</strong> {administrador.nome}</p>
                    <p><strong>CPF:</strong> {administrador.cpf}</p>
                    <p><strong>Email:</strong> {administrador.email}</p>
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

export default GerenciarAdministradores
