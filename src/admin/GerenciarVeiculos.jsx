import './css/GerenciarVeiculos.css'
import { useState } from 'react'
import user from '../assets/place-user.png'
import { ArrowLeft, Bus, CirclePlus } from 'lucide-react'


  

function GerenciarVeiculos() {
  // Constantes 
  const [VeiculoAberto, setVeiculoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  // Constante do banco de dados
  const [novoVeiculo, setNovoVeiculo] = useState({
    nome: '',
    rm: '',
    responsavel: '',
    contatoResponsavel: '',
    endereco: '',
    transporte: '',
    unidade: 'Garcia',
  })

  const veiculos = [
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

  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => (atual === id ? null : id))
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

  const enviarNovoVeiculo = (e) => {
    e.preventDefault()
    fecharAdicionar()
  }


  return (
    <>
      <div className="ui-header">
              <div className="logo"></div>
              <div className="usuario">
                {/* <h1>Usuario</h1> */}
                <img src={user} alt={user} />
                <p>Usuario</p>
              </div>
              <div className="ui-header-extra">
                <a className="ui-back" href="/app" aria-label="Voltar para o painel">
                  <ArrowLeft />
                </a>
                <div className="ui-header-extra-title">
                  <Bus />
                  <span>Veiculos</span>
                </div>
              </div>
            </div>
      
            <div className="adicionar">
              <button type="button" className="adicionar-botao">
                <CirclePlus id='icone-botao'/>
                Cadastrar Veiculo
              </button>
            </div>

            {/* pop-up do formulario ao apertar Adicionar */}
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
                value={novoVeiculo.nome}
                onChange={atualizarCampo('nome')}
              />
              <input
                type="text"
                placeholder="Insira o RM do aluno"
                value={novoVeiculo.rm}
                onChange={atualizarCampo('rm')}
              />
              <input
                type="text"
                placeholder="Nome do responsável"
                value={novoVeiculo.responsavel}
                onChange={atualizarCampo('responsavel')}
              />
              <input
                type="text"
                placeholder="Contato do responsável"
                value={novoVeiculo.contatoResponsavel}
                onChange={atualizarCampo('contatoResponsavel')}
              />
              <input
                type="text"
                placeholder="Endereço do aluno"
                value={novoVeiculo.endereco}
                onChange={atualizarCampo('endereco')}
              />

              <select
                value={novoVeiculo.transporte}
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
                  Mimosa
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
                Confirmar alterações
              </button>
              <button type="button" className="boadd-cancelar" onClick={fecharAdicionar}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default GerenciarVeiculos
