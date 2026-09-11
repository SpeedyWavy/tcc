import styles from './Skeleton.module.css'

export function Skeleton({ className = '', style }) {
  return <span className={`${styles.skeleton} ${className}`} style={style} aria-hidden="true" />
}

export function ListSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`${styles.list} ${className}`} role="status" aria-label="Carregando conteúdo">
      {Array.from({ length: rows }, (_, index) => (
        <div className={styles.listRow} key={index}>
          <Skeleton className={styles.icon} />
          <Skeleton className={styles.line} style={{ width: `${62 + (index % 3) * 12}%` }} />
          <Skeleton className={styles.action} />
        </div>
      ))}
    </div>
  )
}

export function FieldsSkeleton({ fields = 6 }) {
  return (
    <div className={styles.fields} role="status" aria-label="Carregando dados">
      {Array.from({ length: fields }, (_, index) => (
        <div className={styles.field} key={index}>
          <Skeleton className={styles.label} />
          <Skeleton className={styles.input} />
        </div>
      ))}
    </div>
  )
}
