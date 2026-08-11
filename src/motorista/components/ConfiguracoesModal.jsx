import { useState } from 'react'
import styles from './ConfiguracoesModal.module.css'
import {
  getModoEscuro,
  setModoEscuro,
  getPreferenciaNavegacao,
  setPreferenciaNavegacao,
  NAVEGACAO_GOOGLE_MAPS,
  NAVEGACAO_WAZE,
} from '../../lib/preferenciasMotorista.js'

function ConfiguracoesModal({ onClose }) {
  const [modoEscuro, setModoEscuroState] = useState(() => getModoEscuro())
  const [preferenciaNavegacao, setPreferenciaNavegacaoState] = useState(() => getPreferenciaNavegacao())

  const alternarModoEscuro = () => {
    const novoValor = !modoEscuro
    setModoEscuroState(novoValor)
    setModoEscuro(novoValor)
  }

  const escolherNavegacao = (valor) => {
    setPreferenciaNavegacaoState(valor)
    setPreferenciaNavegacao(valor)
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
          <span>Preferência de Navegação</span>
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