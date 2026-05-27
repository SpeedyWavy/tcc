import styles from './FilterPanel.module.css'

// Função do filtro para todas as paginas com listas.
function FilterPanel({ open, title = 'Filtre por...', sections, draftFilters, onToggle, onApply, onClear, onClose }) {
  if (!open) {
    return null
  }

  return (
    <div className={styles['filter-panel']}>
      <div className={styles['filter-panel-header']}>
        <span>{title}</span>
        <button type="button" className={styles['filter-panel-close']} onClick={onClose} aria-label="Fechar filtros">
          X
        </button>
      </div>

      <div className={styles['filter-panel-body']}>
        {sections.map((section) => (
          <div key={section.id} className={styles['filter-panel-section']}>
            <h3>{section.label}:</h3>
            <div className={styles['filter-panel-options']}>
              {section.options.length > 0 ? (
                section.options.map((option) => (
                  <label key={option.value} className={styles['filter-panel-option']}>
                    <input
                      type="checkbox"
                      checked={draftFilters[section.id]?.includes(option.value) || false}
                      onChange={() => onToggle(section.id, option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))
              ) : (
                <p className={styles['filter-panel-empty']}>Sem opcoes disponiveis.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles['filter-panel-footer']}>
        <button type="button" className={styles['filter-panel-clear']} onClick={onClear}>
          Limpar filtros
        </button>
        <button type="button" className={styles['filter-panel-apply']} onClick={onApply}>
          Filtrar
        </button>
      </div>
    </div>
  )
}

export default FilterPanel
