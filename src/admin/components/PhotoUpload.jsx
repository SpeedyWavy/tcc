import { useEffect, useState, useRef } from 'react'
import { Camera, X, GraduationCap, User, ZoomIn } from 'lucide-react'
import styles from './PhotoUpload.module.css'
import { supabase } from '../../supabase.js'

function PhotoUpload({
  photoUrl,
  onPhotoChange,
  entityType = 'driver',
  entityId = null,
  userName = '',
  onUploadingChange = () => {},
  size = 120,
  iconSize = 32,
  badgeSize = 32,
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(photoUrl || null)
  const [cropSource, setCropSource] = useState(null)
  const [cropMetrics, setCropMetrics] = useState(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef(null)
  const dragRef = useRef(null)
  const PlaceholderIcon = entityType === 'student' ? GraduationCap : User

  useEffect(() => {
    setPreview(photoUrl || null)
  }, [photoUrl])

  const closeCropEditor = () => {
    if (cropSource?.url) {
      URL.revokeObjectURL(cropSource.url)
    }
    setCropSource(null)
    setCropMetrics(null)
    setCropZoom(1)
    setCropPosition({ x: 0, y: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.')
      return
    }

    // Validar tamanho (maximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter menos de 5MB.')
      return
    }

    setCropSource({ file, url: URL.createObjectURL(file) })
    setCropZoom(1)
    setCropPosition({ x: 0, y: 0 })
  }

  const handleCropImageLoad = (event) => {
    const image = event.currentTarget
    const viewportSize = image.parentElement?.clientWidth || 280
    const baseScale = Math.max(viewportSize / image.naturalWidth, viewportSize / image.naturalHeight)
    setCropMetrics({
      width: image.naturalWidth,
      height: image.naturalHeight,
      viewportSize,
      displayWidth: image.naturalWidth * baseScale,
      displayHeight: image.naturalHeight * baseScale,
    })
  }

  const constrainCropPosition = (position, zoom = cropZoom) => {
    if (!cropMetrics) return position

    const viewportSize = cropMetrics.viewportSize
    const maxX = Math.max(0, (cropMetrics.displayWidth * zoom - viewportSize) / 2)
    const maxY = Math.max(0, (cropMetrics.displayHeight * zoom - viewportSize) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, position.x)),
      y: Math.min(maxY, Math.max(-maxY, position.y)),
    }
  }

  const handleCropPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startY: event.clientY, position: cropPosition }
  }

  const handleCropPointerMove = (event) => {
    if (!dragRef.current) return
    const { startX, startY, position } = dragRef.current
    setCropPosition(constrainCropPosition({
      x: position.x + event.clientX - startX,
      y: position.y + event.clientY - startY,
    }))
  }

  const handleCropPointerEnd = () => {
    dragRef.current = null
  }

  const uploadPhoto = async (file) => {
    setUploading(true)
    onUploadingChange(true)

    try {
      // Upload para Supabase Storage
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 10)
      const fileName = `${entityType}_${entityId || timestamp}_${randomStr}_${userName.replace(/\s+/g, '_')}.jpg`
      const filePath = `${entityType}s/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        alert('Erro ao fazer upload da foto. Tente novamente.')
        setUploading(false)
        onUploadingChange(false)
        return
      }

      // Obter URL da imagem
      const { data: publicData } = supabase.storage
        .from('user-photos')
        .getPublicUrl(filePath)

      let publicUrl = publicData?.publicUrl

      if (!publicUrl) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('user-photos')
          .createSignedUrl(filePath, 60)

        if (signedError || !signedData?.signedUrl) {
          console.error('Não foi possivel obter a URL pública ou assinada da imagem.', publicData, signedError)
          alert('Erro ao obter a URL da foto. Tente novamente.')
          setUploading(false)
          onUploadingChange(false)
          return
        }

        publicUrl = signedData.signedUrl
      }

      // Notificar o componente pai com a URL
      setPreview(publicUrl)
      onPhotoChange(publicUrl, filePath)
      setUploading(false)
      onUploadingChange(false)
    } catch (error) {
      console.error('Erro ao processar foto:', error)
      alert('Erro ao processar a foto.')
      setUploading(false)
      onUploadingChange(false)
    }
  }

  const applyCrop = () => {
    if (!cropSource || !cropMetrics) return

    const image = new Image()
    image.onload = async () => {
      const outputSize = 512
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize

      const context = canvas.getContext('2d')
      if (!context) return

      const baseScale = Math.max(outputSize / cropMetrics.width, outputSize / cropMetrics.height)
      const scaledWidth = cropMetrics.width * baseScale * cropZoom
      const scaledHeight = cropMetrics.height * baseScale * cropZoom
      const positionScale = outputSize / cropMetrics.viewportSize
      const offsetX = (outputSize - scaledWidth) / 2 + cropPosition.x * positionScale
      const offsetY = (outputSize - scaledHeight) / 2 + cropPosition.y * positionScale
      context.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight)

      canvas.toBlob(async (blob) => {
        if (!blob) return
        const croppedFile = new File([blob], `perfil-${Date.now()}.jpg`, { type: 'image/jpeg' })
        closeCropEditor()
        await uploadPhoto(croppedFile)
      }, 'image/jpeg', 0.92)
    }
    image.src = cropSource.url
  }

  const handleRemovePhoto = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onPhotoChange(null, null)
    onUploadingChange(false)
  }

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={styles['photo-upload-container']}
      style={{ '--pu-size': `${size}px`, '--pu-badge-size': `${badgeSize}px` }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
      />

      <div className={styles['photo-frame']}>
        {preview ? (
          <>
            <img src={preview} alt="Preview" className={styles['photo-preview']} />
            <div className={styles['photo-overlay']}>
              <button
                type="button"
                className={styles['photo-button']}
                onClick={handleClick}
                disabled={uploading}
                title="Trocar foto"
              >
                <Camera size={20} />
              </button>
              <button
                type="button"
                className={`${styles['photo-button']} ${styles['remove']}`}
                onClick={handleRemovePhoto}
                disabled={uploading}
                title="Remover foto"
              >
                <X size={20} />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles['photo-button-add']}
            onClick={handleClick}
            disabled={uploading}
            title="Adicionar foto"
          >
            <PlaceholderIcon size={iconSize} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {!preview && (
        <span className={styles['photo-badge']} aria-hidden="true">
          <Camera size={Math.round(badgeSize * 0.45)} />
        </span>
      )}

      {uploading && <div className={styles['uploading-spinner']} />}

      {cropSource && (
        <div className={styles['crop-overlay']} role="dialog" aria-modal="true" aria-label="Centralizar foto de perfil">
          <div className={styles['crop-card']}>
            <div className={styles['crop-header']}>
              <h2>Centralizar foto</h2>
              <button type="button" onClick={closeCropEditor} aria-label="Fechar editor"><X /></button>
            </div>
            <p className={styles['crop-hint']}>Arraste a imagem e ajuste o zoom para definir o enquadramento.</p>
            <div
              className={styles['crop-viewport']}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerEnd}
              onPointerCancel={handleCropPointerEnd}
            >
              <img
                src={cropSource.url}
                alt="Previa para recorte"
                onLoad={handleCropImageLoad}
                draggable="false"
                style={cropMetrics ? {
                  width: `${cropMetrics.displayWidth}px`,
                  height: `${cropMetrics.displayHeight}px`,
                  left: `calc(50% + ${cropPosition.x}px)`,
                  top: `calc(50% + ${cropPosition.y}px)`,
                  transform: `translate(-50%, -50%) scale(${cropZoom})`,
                } : undefined}
              />
            </div>
            <label className={styles['crop-zoom']}>
              <ZoomIn />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropZoom}
                onChange={(event) => {
                  const zoom = Number(event.target.value)
                  setCropZoom(zoom)
                  setCropPosition((position) => constrainCropPosition(position, zoom))
                }}
                aria-label="Zoom da foto"
              />
            </label>
            <div className={styles['crop-actions']}>
              <button type="button" className={styles['crop-cancel']} onClick={closeCropEditor}>Cancelar</button>
              <button type="button" className={styles['crop-apply']} onClick={applyCrop} disabled={!cropMetrics}>Aplicar foto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoUpload

// 
