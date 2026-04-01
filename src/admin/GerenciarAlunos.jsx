import { useState } from 'react'
import './css/GerenciarAlunos.css'
import user from '../assets/place-user.png'
import student2 from '../assets/student2.png'
import student3 from '../assets/student3.png'
import { ArrowLeft, CirclePlus, Users, Search } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'

function GerenciarAlunos() {

  // Informações do banco de dados (linkar o banco de dados aq)
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [novoAluno, setNovoAluno] = useState({
    nome: '',
    rm: '',
    responsavel: '',
    contatoResponsavel: '',
    endereco: '',
    transporte: '',
    unidade: 'Garcia',
  })

  // informações so pra aparecer os elementos na tela enqnt n tem banco de dados
  const alunos = [
    {
      id: 1,
      nome: 'Aluno 1',
      rm: '37441',
      unidade: 'Unidade Garcia',
      identificacaoTransporte: 'Linha 01 - Van 3',
      responsavel: 'Responsavel 1',
      contatoResponsavel: '(19) 99999-0001',
      endereco: 'Rua Barata Ribeiro, Cambui, Campinas - SP',
    },
    {
      id: 2,
      nome: 'Aluno 2',
      rm: '27051',
      unidade: 'Unidade Garcia',
      identificacaoTransporte: 'Linha 02 - Ônibus 2',
      responsavel: 'Responsavel 2',
      contatoResponsavel: '(19) 99999-0002',
      endereco: 'Avenida Francisco Glicerio, Centro, Campinas - SP',
    },
    {
      id: 3,
      nome: 'Aluno 3',
      rm: '38294',
      unidade: 'Unidade Mimosa',
      identificacaoTransporte: 'Linha 03 - Van 1',
      responsavel: 'Responsavel 3',
      contatoResponsavel: '(19) 99999-0003',
      endereco: 'Rua Geraldo de Almeida Santos, Taquaral, Campinas - SP',
    },
    {
      id: 4,
      nome: 'Aluno 4',
      rm: '39212',
      unidade: 'Unidade Mimosa',
      identificacaoTransporte: 'Linha 04 - Ônibus 5',
      responsavel: 'Responsavel 4',
      contatoResponsavel: '(19) 99999-0004',
      endereco: 'Avenida John Boyd Dunlop, Jardim Aurelia, Campinas - SP',
    },
    {
      id: 5,
      nome: 'Aluno 5',
      rm: '37872',
      unidade: 'Unidade Swiss',
      identificacaoTransporte: 'Linha 05 - Van 2',
      responsavel: 'Responsavel 5',
      contatoResponsavel: '(19) 99999-0005',
      endereco: 'Rua Alberto Faria, Vila Itapura, Campinas - SP',
    },
  ]

  const alternarAluno = (id) => {
    setAlunoAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
  }

  const atualizarCampo = (campo) => (e) => {
    setNovoAluno((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const enviarNovoAluno = (e) => {
    e.preventDefault()
    fecharAdicionar()
  }

  return (
    <>
      {/* Header principal */}
      <div className="ui-header">
        <div className="logo"></div>
        <div className="usuario">
          <img src={user} alt={user} />
          <p>Usuario</p>
        </div>
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            {/* Icone do titulo */}
            <img src={student3} alt={student3} className="ui-header-extra-icon" />
            <span>Alunos</span>
          </div>
        </div>
      </div>

      {/* Ações principais */}
      <div className="adicionar">
        <button type="button" className="adicionar-botao" onClick={abrirAdicionar}>
          <CirclePlus id='icone-botao'/>
          Cadastrar Aluno
        </button>
      </div>

      {/* Pop-up do formulario */}
      {formularioAberto && (
        <div className="boadd-overlay" onClick={fecharAdicionar}>
          <div
            className="boadd-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="boadd-top">
              <div className="boadd-avatar">
                <img src={student2} alt="" />
              </div>
            </div>

            <form className="boadd-form" onSubmit={enviarNovoAluno}>
              <input
                type="text"
                placeholder="Digite o nome do aluno"
                value={novoAluno.nome}
                onChange={atualizarCampo('nome')}
              />
              <input
                type="text"
                placeholder="Insira o RM do aluno"
                value={novoAluno.rm}
                onChange={atualizarCampo('rm')}
              />
              <input
                type="text"
                placeholder="Nome do responsável"
                value={novoAluno.responsavel}
                onChange={atualizarCampo('responsavel')}
              />
              <input
                type="text"
                placeholder="Contato do responsável"
                value={novoAluno.contatoResponsavel}
                onChange={atualizarCampo('contatoResponsavel')}
              />
              <input
                type="text"
                placeholder="Endereço do aluno"
                value={novoAluno.endereco}
                onChange={atualizarCampo('endereco')}
              />

              <select
                value={novoAluno.transporte}
                onChange={atualizarCampo('transporte')}
              >
                <option value="">Identificação do transporte</option>
                <option value="Linha 01 - Van 3">Linha 01 - Van 3</option>
                <option value="Linha 02 - Ônibus 2">Linha 02 - Ônibus 2</option>
                <option value="Linha 03 - Van 1">Linha 03 - Van 1</option>
                <option value="Linha 04 - Ônibus 5">Linha 04 - Ônibus 5</option>
                <option value="Linha 05 - Van 2">Linha 05 - Van 2</option>
              </select>

              <div className="boadd-unidade">
                <p>Unidade:</p>
                <label>
                  <input
                    type="radio"
                    name="unidade"
                    value="Garcia"
                    checked={novoAluno.unidade === 'Garcia'}
                    onChange={atualizarCampo('unidade')}
                  />
                  Garcia
                </label>
                <label>
                  <input
                    type="radio"
                    name="unidade"
                    value="Vila Mimosa"
                    checked={novoAluno.unidade === 'Vila Mimosa'}
                    onChange={atualizarCampo('unidade')}
                  />
                  Mimosa
                </label>
                <label>
                  <input
                    type="radio"
                    name="unidade"
                    value="Swiss Park"
                    checked={novoAluno.unidade === 'Swiss Park'}
                    onChange={atualizarCampo('unidade')}
                  />
                  Swiss Park
                </label>
              </div>

              <button type="submit" className="boadd-confirmar">
                Confirmar alterações
              </button>
              <button type="button" className="boadd-cancelar" onClick={fecharAdicionar}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lista de alunos */}
      <div className="cadastros">
        <div className="filtro">
          <div className="filtro-input-wrap">
            <Search className="filtro-icon" />
            <input type="text" placeholder="Buscar aluno" className="filtro-input" />
          </div>
          <ArrowDownNarrowWide className="icone-filtro" />
          <p className="busca-filtro">Filtrar Por</p>
        </div>
        <div className="alunos-grid">
          {alunos.map((aluno) => (
            <div key={aluno.id} className="aluno-item">
              <div
                className={`aluno aluno${aluno.id} ${alunoAberto === aluno.id ? 'aberto' : ''}`}
                onClick={() => alternarAluno(aluno.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarAluno(aluno.id)
                  }
                }}
              >
                <p className='setinha'>{alunoAberto === aluno.id ? 'v' : '>'}</p>
                <h1>{aluno.nome}</h1>
                <p className='pontinhos'>&#8801;</p>
              </div>

                {/* informações ao apertar pra  abrir */}
              {alunoAberto === aluno.id && (
                <div className="aluno-detalhes">
                  <div className="aluno-card-top">
                  <div className="aluno-foto" />
                    <div className="aluno-info">
                      <p><strong>RM:</strong> {aluno.rm}</p>
                      <p><strong>Unidade:</strong> {aluno.unidade}</p>
                      <p><strong>Transporte: </strong> {aluno.identificacaoTransporte}</p>
                      <p><strong>Responsavel:</strong> {aluno.responsavel}</p>
                    </div>
                  </div>
                  <div className="aluno-info-extra">
                    <p><strong>Contato do responsavel:</strong> {aluno.contatoResponsavel}</p>
                    <p><strong>Endereco:</strong> {aluno.endereco}</p>
                  </div>
                  <div className="aluno-mapa">
                    <div className="mapa-placeholder" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default GerenciarAlunos
