import { useState } from 'react'
import './GerenciarAlunos.css'
import doguinho from './assets/doguinho.png'
import doguinho2 from './assets/doguinho2.png'
import { CornerDownLeft } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'

function GerenciarAlunos() {
  const [alunoAberto, setAlunoAberto] = useState<number | null>(null)

  const alunos = [
    { id: 1, nome: 'Aluno 1', turma: 'Turma A', responsavel: 'Responsavel 1' },
    { id: 2, nome: 'Aluno 2', turma: 'Turma B', responsavel: 'Responsavel 2' },
    { id: 3, nome: 'Aluno 3', turma: 'Turma A', responsavel: 'Responsavel 3' },
    { id: 4, nome: 'Aluno 4', turma: 'Turma C', responsavel: 'Responsavel 4' },
    { id: 5, nome: 'Aluno 5', turma: 'Turma B', responsavel: 'Responsavel 5' },
  ]

  const alternarAluno = (id: number) => {
    setAlunoAberto((atual) => (atual === id ? null : id))
  }

  return (
    <>
      {/* Header de Todas as Paginas do Aplicativo */}
      <div className="ui-header">
        <div className="logo">
          <img src={doguinho} alt={doguinho} />
        </div>
        <div className="usuario">
          <h1>Usuario</h1>
          <img src={doguinho2} alt={doguinho2} />
        </div>
        <div className="ui-header-extra"></div>

        <div className="voltar"><a href="/App"> <CornerDownLeft />   Voltar</a></div>
      </div>

      {/* Lista dos Alunos/Cadastros */}
      <div className="cadastros">
        <div className="filtro"> <input type="text" placeholder='Pesquisar' /> <ArrowDownNarrowWide className="icone-filtro" /> </div>

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

            {alunoAberto === aluno.id && (
              <div className="aluno-detalhes">
                <p><strong>Nome:</strong> {aluno.nome}</p>
                <p><strong>Turma:</strong> {aluno.turma}</p>
                <p><strong>Responsavel:</strong> {aluno.responsavel}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export default GerenciarAlunos

