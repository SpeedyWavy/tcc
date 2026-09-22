import { useState } from 'react'
import styles from './ConfiguracoesModal.module.css'
import {
  getModoEscuro,
  setModoEscuro,
  getPreferenciaNavegacao,
  setPreferenciaNavegacao,
  NAVEGACAO_GOOGLE_MAPS,
  NAVEGACAO_WAZE,
  getModoNavegacao,
  setModoNavegacao,
  MODO_PASSO_A_PASSO,
  MODO_ROTA_COMPLETA,
  MODO_EMBUTIDO,
} from '../../lib/preferenciasMotorista.js'

function ConfiguracoesModal({ onClose }) {
  const [modoEscuro, setModoEscuroState] = useState(() => getModoEscuro())
  const [preferenciaNavegacao, setPreferenciaNavegacaoState] = useState(() => getPreferenciaNavegacao())
  const [modoNavegacao, setModoNavegacaoState] = useState(() => getModoNavegacao())

  const alternarModoEscuro = () => {
    const novoValor = !modoEscuro
    setModoEscuroState(novoValor)
    setModoEscuro(novoValor)
  }

  const escolherNavegacao = (valor) => {
    setPreferenciaNavegacaoState(valor)
    setPreferenciaNavegacao(valor)
  }

  const escolherModoNavegacao = (valor) => {
    setModoNavegacaoState(valor)
    setModoNavegacao(valor)
  }

  return (
    <div className={styles['config-overlay']} onClick={onClose}>
      <div className={styles['config-card']} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles['config-titulo']}>Configurações</h2>

        <div className={styles['config-item']}>
          <span>Modo Escuro</span>
          <label className={styles['switch']}>
            <input type="checkbox" checked={modoEscuro} onChange={alternarModoEscuro} />
            <span className={styles['switch-trilho']} />
          </label>
        </div>

        <div className={styles['config-item-coluna']}>
          <span>Modo do Trajeto</span>
          <div className={styles['config-radios']}>
            <label>
              <input
                type="radio"
                name="modo-navegacao"
                checked={modoNavegacao === MODO_PASSO_A_PASSO}
                onChange={() => escolherModoNavegacao(MODO_PASSO_A_PASSO)}
              />
              Passo a passo (um aluno por vez)
            </label>
            <label>
              <input
                type="radio"
                name="modo-navegacao"
                checked={modoNavegacao === MODO_ROTA_COMPLETA}
                onChange={() => escolherModoNavegacao(MODO_ROTA_COMPLETA)}
              />
              Rota completa no Google Maps
            </label>
            <label>
              <input
                type="radio"
                name="modo-navegacao"
                checked={modoNavegacao === MODO_EMBUTIDO}
                onChange={() => escolherModoNavegacao(MODO_EMBUTIDO)}
              />
              Navegação embutida no app
            </label>
          </div>
        </div>

        <div className={styles['config-item-coluna']}>
          <span>Preferência de Navegação</span>
          <p className={styles['config-nota']}>Usado no modo "Passo a passo" (a "Rota completa" sempre abre no Google Maps)</p>
          <div className={styles['config-radios']}>
            <label>
              <input
                type="radio"
                name="preferencia-navegacao"
                checked={preferenciaNavegacao === NAVEGACAO_GOOGLE_MAPS}
                onChange={() => escolherNavegacao(NAVEGACAO_GOOGLE_MAPS)}
              />
              Google Maps
            </label>
            <label>
              <input
                type="radio"
                name="preferencia-navegacao"
                checked={preferenciaNavegacao === NAVEGACAO_WAZE}
                onChange={() => escolherNavegacao(NAVEGACAO_WAZE)}
              />
              Waze
            </label>
          </div>
        </div>

        <button type="button" className={styles['config-fechar']} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}

export default ConfiguracoesModal