import { useState } from 'react'
import './css/Alunos.css'
import student3 from '../assets/student3.png'
import { ArrowLeft, ChevronDown, ChevronRight, Search } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'

function Alunos() {
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [busca, setBusca] = useState('')

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
      identificacaoTransporte: 'Linha 02 - Onibus 2',
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
      identificacaoTransporte: 'Linha 04 - Onibus 5',
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

  const alunosFiltrados = alunos.filter((aluno) =>
    [
      aluno.nome,
      aluno.rm,
      aluno.unidade,
      aluno.identificacaoTransporte,
      aluno.responsavel,
      aluno.contatoResponsavel,
      aluno.endereco,
    ]
      .join(' ')
      .toLowerCase()
      .includes(busca.toLowerCase())
  )

  return (
    <main className="motorista-page motorista-page--alunos">
      <div className="ui-header">
        <div className="logo"></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <img src={student3} alt={student3} className="ui-header-extra-icon" />
            <span>Alunos</span>
          </div>
        </div>
      </div>

      <div className="cadastros">
        <div className="motorista-alunos-busca">
          <div className="motorista-alunos-busca-wrap">
            <Search className="motorista-alunos-busca-icon" />
            <input
              type="text"
              placeholder="Buscar aluno"
              className="motorista-alunos-busca-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="alunos-grid">
          {alunosFiltrados.map((aluno) => (
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
                {alunoAberto === aluno.id ? (
                  <ChevronDown className="setinha" />
                ) : (
                  <ChevronRight className="setinha" />
                )}
                <h1>{aluno.nome}</h1>
                <p className="pontinhos">&#8801;</p>
              </div>

              {alunoAberto === aluno.id && (
                <div className="aluno-detalhes">
                  <div className="aluno-card-top">
                    <div className="aluno-foto" />
                    <div className="aluno-info">
                      <p><strong>RM:</strong> {aluno.rm}</p>
                      <p><strong>Unidade:</strong> {aluno.unidade}</p>
                      <p><strong>Transporte:</strong> {aluno.identificacaoTransporte}</p>
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
    </main>
  )
}

export default Alunos
