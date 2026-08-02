import { useEffect, useState, useRef } from 'react'
import { Camera, X, GraduationCap, User } from 'lucide-react'
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
  const fileInputRef = useRef(null)
  const PlaceholderIcon = entityType === 'student' ? GraduationCap : User

  useEffect(() => {
    setPreview(photoUrl || null)
  }, [photoUrl])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter menos de 5MB.')
      return
    }

    setUploading(true)
    onUploadingChange(true)

    try {
      // Criar preview local
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result)
      }
      reader.readAsDataURL(file)

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
          console.error('Nao foi possivel obter a URL publica ou assinada da imagem.', publicData, signedError)
          alert('Erro ao obter a URL da foto. Tente novamente.')
          setUploading(false)
          onUploadingChange(false)
          return
        }

        publicUrl = signedData.signedUrl
      }

      // Notificar o componente pai com a URL
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
    </div>
  )
}

export default PhotoUpload