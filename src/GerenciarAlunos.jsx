import { useState } from 'react'
import './GerenciarAlunos.css'
import logords from './assets/logo-rds.png'
import user from './assets/place-user.png'
import { CornerDownLeft, CirclePlus } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'

function GerenciarAlunos() {
  const [alunoAberto, setAlunoAberto] = useState(null)

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

  return (
    <>
      <div className="ui-header">
        <div className="logo">
          <img src={logords} alt={logords} />
        </div>
        <div className="usuario">
          {/* <h1>Usuario</h1> */}
          <img src={user} alt={user} />
        </div>
        <div className="ui-header-extra"></div>
      </div>
      <div className="voltar"><a href="/app"> <CornerDownLeft />   Voltar</a></div>

      <div className="adicionar">
        <button type="button" className="adicionar-botao">
          <CirclePlus />
          Adicionar
        </button>
      </div>

      {/* Lista dos Alunos/Cadastros */}
      <div className="cadastros">
        <div className="filtro"> <input type="text" placeholder='Pesquisar' /> <ArrowDownNarrowWide className="icone-filtro" /> </div>
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

                {/* Informações ao Apertar para abrir */}
              {alunoAberto === aluno.id && (
                <div className="aluno-detalhes">
                  <div className="aluno-card-top">
                    <div className="aluno-foto" aria-hidden="true" />
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
                    <div className="mapa-placeholder" aria-hidden="true" />
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


