import { useEffect, useRef, useState } from 'react'
import styles from './css/GerenciarAlunos.module.css'
import student2 from '../assets/student2.png'
import student3 from '../assets/student3.png'
import { ArrowLeft, CirclePlus, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import PhotoUpload from './components/PhotoUpload.jsx'
import AddressAutocompleteInput from './components/AddressAutocompleteInput.jsx'
import MiniMap from './components/MiniMap.jsx'
import { apiRequest } from '../api.js'
import { supabase } from '../supabase.js'
import { loadGoogleMaps } from '../lib/googleMapsLoader.js'
import { formatPhone, isPhoneComplete, onlyDigits } from './formValidators.js'

const alunoInicial = {
  nome: '',
  rm: '',
  responsavel: '',
  contatoResponsavel: '',
  endereco: '',
  latitude: null,
  longitude: null,
  transporte: '',
  unidade: 'Garcia',
  fotoUrl: null,
}

const enderecoInicial = {
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
}

function GerenciarAlunos() {
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editorAberto, setEditorAberto] = useState(false)
  const [passoCadastro, setPassoCadastro] = useState(1)
  const [novoAluno, setNovoAluno] = useState(alunoInicial)
  const [enderecoForm, setEnderecoForm] = useState(enderecoInicial)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [alunoEmEdicao, setAlunoEmEdicao] = useState(null)
  const [alunos, setAlunos] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [filtrosAplicados, setFiltrosAplicados] = useState({ unidade: [], responsavel: [], transporte: [] })
  const [filtrosRascunho, setFiltrosRascunho] = useState({ unidade: [], responsavel: [], transporte: [] })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [fotoUrlArmazenado, setFotoUrlArmazenado] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const menuRef = useRef(null)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarAlunos = async () => {
    try {
      const data = await apiRequest('/api/students')
      setAlunos(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar alunos.')
    }
  }

  const carregarVeiculos = async () => {
    try {
      const data = await apiRequest('/api/vehicles')
      setVeiculos(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar veículos.')
    }
  }

  useEffect(() => {
    carregarAlunos()
    carregarVeiculos()
  }, [])

  useEffect(() => {
    if (!menuAberto) {
      return undefined
    }

    const fecharAoClicarFora = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(null)
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora)
    }
  }, [menuAberto])

  const alternarAluno = (id) => {
    setAlunoAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
    setPassoCadastro(1)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
    setPassoCadastro(1)
    setNovoAluno(alunoInicial)
    setEnderecoForm(enderecoInicial)
    setFotoUrlArmazenado(null)
    setPhotoUploading(false)
  }

  const abrirEditor = (aluno) => {
    setMenuAberto(null)
    setAlunoEmEdicao(aluno)
    setNovoAluno({
      nome: aluno.name || aluno.nome || '',
      rm: onlyDigits(aluno.rm || '', 12),
      responsavel: aluno.responsible_name || aluno.responsavel || '',
      contatoResponsavel: formatPhone(aluno.parent_contact || aluno.contato_responsavel || ''),
      endereco: aluno.address || aluno.endereco || '',
      latitude: aluno.latitude ?? null,
      longitude: aluno.longitude ?? null,
      transporte: aluno.transport_identification || aluno.transporte || '',
      unidade: aluno.unit || aluno.unidade || 'Garcia',
      fotoUrl: aluno.photo_url || null,
    })
    setFotoUrlArmazenado(aluno.photo_url || null)
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setAlunoEmEdicao(null)
    setNovoAluno(alunoInicial)
    setFotoUrlArmazenado(null)
    setPhotoUploading(false)
  }

  const atualizarCampo = (campo) => (e) => {
    const formatters = {
      rm: (value) => onlyDigits(value, 12),
      contatoResponsavel: formatPhone,
    }
    const value = formatters[campo] ? formatters[campo](e.target.value) : e.target.value
    setNovoAluno((atual) => ({ ...atual, [campo]: value }))
  }

  const alterarEnderecoDigitado = (e) => {
    // Digitação livre invalida a coordenada anterior: só volta a ser confiável
    // quando o usuário selecionar uma sugestão do autocomplete novamente.
    setNovoAluno((atual) => ({ ...atual, endereco: e.target.value, latitude: null, longitude: null }))
  }

  const selecionarEnderecoAutocomplete = ({ endereco, latitude, longitude }) => {
    setNovoAluno((atual) => ({ ...atual, endereco, latitude, longitude }))
  }

  const formatCep = (value) => {
    const digitos = onlyDigits(value, 8)
    return digitos.length <= 5 ? digitos : `${digitos.slice(0, 5)}-${digitos.slice(5)}`
  }

  const atualizarEndereco = (campo) => (e) => {
    const value = campo === 'cep' ? formatCep(e.target.value) : e.target.value
    setEnderecoForm((atual) => ({ ...atual, [campo]: value }))

    // Editar o CEP depois de uma busca invalida a coordenada anterior,
    // forcando uma nova busca antes de finalizar o cadastro.
    if (campo === 'cep') {
      setNovoAluno((atual) => ({ ...atual, latitude: null, longitude: null }))
    }
  }

  const buscarEnderecoPorCep = async () => {
    const cepDigitos = onlyDigits(enderecoForm.cep, 8)
    if (cepDigitos.length !== 8) {
      return
    }

    setBuscandoCep(true)
    try {
      const maps = await loadGoogleMaps()
      const geocoder = new maps.Geocoder()

      const resultado = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { componentRestrictions: { country: 'BR', postalCode: cepDigitos } },
          (results, status) => {
            if (status === 'OK' && results?.[0]) {
              resolve(results[0])
            } else {
              reject(new Error('CEP nao encontrado.'))
            }
          },
        )
      })

      const componentes = resultado.address_components
      const pegar = (tipo) => componentes.find((c) => c.types.includes(tipo))

      const rua = pegar('route')?.long_name || ''
      const bairro =
        pegar('sublocality_level_1')?.long_name ||
        pegar('sublocality')?.long_name ||
        pegar('neighborhood')?.long_name ||
        ''
      const cidade = pegar('locality')?.long_name || pegar('administrative_area_level_2')?.long_name || ''
      const estado = pegar('administrative_area_level_1')?.short_name || ''

      setEnderecoForm((atual) => ({ ...atual, rua, bairro, cidade, estado }))
      setNovoAluno((atual) => ({
        ...atual,
        latitude: resultado.geometry.location.lat(),
        longitude: resultado.geometry.location.lng(),
      }))
    } catch (error) {
      showError(error.message || 'Nao foi possivel localizar esse CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  const handleCepKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarEnderecoPorCep()
    }
  }

  // Reforca a precisao das coordenadas usando o endereco completo (com numero),
  // ja que a busca por CEP retorna apenas o centro aproximado da regiao.
  // Em caso de falha, mantem a coordenada aproximada do CEP em vez de bloquear o cadastro.
  const refinarCoordenadasComNumero = async () => {
    const coordenadaAtual = { latitude: novoAluno.latitude, longitude: novoAluno.longitude }
    const { rua, numero, bairro, cidade, estado, cep } = enderecoForm

    if (!numero.trim()) {
      return coordenadaAtual
    }

    try {
      const maps = await loadGoogleMaps()
      const geocoder = new maps.Geocoder()
      const enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade} - ${estado}, ${cep}, Brasil`

      const resultado = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: enderecoCompleto, region: 'br' }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            resolve(results[0])
          } else {
            reject(new Error('sem resultado'))
          }
        })
      })

      const refinada = {
        latitude: resultado.geometry.location.lat(),
        longitude: resultado.geometry.location.lng(),
      }
      setNovoAluno((atual) => ({ ...atual, ...refinada }))
      return refinada
    } catch {
      return coordenadaAtual
    }
  }

  const avancarParaEndereco = () => {
    const nome = novoAluno.nome.trim()
    const rm = novoAluno.rm.trim()
    const responsavel = novoAluno.responsavel.trim()
    const contatoResponsavel = novoAluno.contatoResponsavel.trim()
    const transporte = novoAluno.transporte.trim()
    const unidade = novoAluno.unidade.trim()

    if (!nome || !rm || !responsavel || !contatoResponsavel || !transporte || !unidade) {
      showError('Preencha todos os campos antes de continuar.')
      return
    }

    if (!isPhoneComplete(contatoResponsavel)) {
      showError('Informe o contato do responsavel com DDD e 8 ou 9 digitos.')
      return
    }

    setPassoCadastro(2)
  }

  const voltarParaDadosBasicos = () => {
    setPassoCadastro(1)
  }

  const handlePhotoChange = async (photoUrl, filePath) => {
    setNovoAluno((atual) => ({ ...atual, fotoUrl: photoUrl ?? null }))
    setFotoUrlArmazenado(filePath)

    // If editing an existing student, persist the photo_url immediately
    if (photoUrl && alunoEmEdicao?.id) {
      try {
        const { error } = await supabase
          .from('students')
          .update({ photo_url: photoUrl })
          .eq('id', alunoEmEdicao.id)

        if (error) {
          showError(error.message || 'Erro ao atualizar foto do aluno.')
        } else {
          await carregarAlunos()
          showSuccess('Foto do aluno atualizada.')
        }
      } catch (err) {
        showError(err.message || 'Erro ao atualizar foto do aluno.')
      }
    }
  }

  const validarAluno = () => {
    const nome = novoAluno.nome.trim()
    const rm = novoAluno.rm.trim()
    const responsavel = novoAluno.responsavel.trim()
    const contatoResponsavel = novoAluno.contatoResponsavel.trim()
    const endereco = novoAluno.endereco.trim()
    const transporte = novoAluno.transporte.trim()
    const unidade = novoAluno.unidade.trim()

    if (!nome || !rm || !responsavel || !contatoResponsavel || !endereco || !transporte || !unidade) {
      showError('Preencha todos os campos do cadastro do aluno.')
      return null
    }

    if (!isPhoneComplete(contatoResponsavel)) {
      showError('Informe o contato do responsavel com DDD e 8 ou 9 digitos.')
      return null
    }

    if (novoAluno.latitude == null || novoAluno.longitude == null) {
      showError('Selecione o endereco a partir das sugestoes do mapa para capturar a localizacao.')
      return null
    }

    return {
      name: nome,
      rm,
      responsible_name: responsavel,
      parent_contact: contatoResponsavel,
      address: endereco,
      latitude: novoAluno.latitude,
      longitude: novoAluno.longitude,
      transport_identification: transporte,
      unit: unidade,
      photo_url: novoAluno.fotoUrl || null,
      photo_path: fotoUrlArmazenado || null,
    }
  }

  const enviarNovoAluno = async (e) => {
    e.preventDefault()

    const nome = novoAluno.nome.trim()
    const rm = novoAluno.rm.trim()
    const responsavel = novoAluno.responsavel.trim()
    const contatoResponsavel = novoAluno.contatoResponsavel.trim()
    const transporte = novoAluno.transporte.trim()
    const unidade = novoAluno.unidade.trim()

    const cep = enderecoForm.cep.trim()
    const rua = enderecoForm.rua.trim()
    const numero = enderecoForm.numero.trim()
    const complemento = enderecoForm.complemento.trim()
    const bairro = enderecoForm.bairro.trim()
    const cidade = enderecoForm.cidade.trim()
    const estado = enderecoForm.estado.trim()

    if (!cep || !rua || !numero || !bairro || !cidade || !estado) {
      showError('Preencha o CEP e complete o endereco (numero, bairro, cidade e estado).')
      return
    }

    if (novoAluno.latitude == null || novoAluno.longitude == null) {
      showError('Busque o CEP para localizar o endereco no mapa antes de finalizar.')
      return
    }

    const enderecoCompleto = [
      [rua, numero].filter(Boolean).join(', '),
      complemento || null,
      bairro,
      [cidade, estado].filter(Boolean).join(' - '),
      cep,
    ]
      .filter(Boolean)
      .join(', ')

    setFormSubmitting(true)
    try {
      const coordenadasFinais = await refinarCoordenadasComNumero()

      await apiRequest('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          name: nome,
          rm,
          responsible_name: responsavel,
          parent_contact: contatoResponsavel,
          address: enderecoCompleto,
          latitude: coordenadasFinais.latitude,
          longitude: coordenadasFinais.longitude,
          transport_identification: transporte,
          unit: unidade,
          photo_url: novoAluno.fotoUrl || null,
          photo_path: fotoUrlArmazenado || null,
        }),
      })

      await carregarAlunos()
      showSuccess('Aluno cadastrado com sucesso.')
      fecharAdicionar()
    } catch (error) {
      showError(error.message || 'Erro ao cadastrar aluno.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const salvarEdicaoAluno = async (e) => {
    e.preventDefault()

    if (!alunoEmEdicao) {
      return
    }

    const payload = validarAluno()
    if (!payload) {
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest(`/api/students/${alunoEmEdicao.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      await carregarAlunos()
      showSuccess('Aluno atualizado com sucesso.')
      fecharEditor()
    } catch (error) {
      showError(error.message || 'Erro ao atualizar aluno.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const excluirAluno = async (aluno) => {
    setMenuAberto(null)
    const confirmou = window.confirm(`Deseja excluir o aluno "${aluno.name}"?`)
    if (!confirmou) {
      return
    }

    try {
      await apiRequest(`/api/students/${aluno.id}`, { method: 'DELETE' })
      await carregarAlunos()
      showSuccess('Aluno excluido com sucesso.')
      if (alunoEmEdicao?.id === aluno.id) {
        fecharEditor()
      }
    } catch (error) {
      showError(error.message || 'Erro ao excluir aluno.')
    }
  }

  const opcoesUnidade = [...new Set(alunos.map((aluno) => aluno.unit || aluno.unidade).filter(Boolean))]
  const opcoesMotorista = [...new Set(alunos.map((aluno) => aluno.responsible_name || aluno.responsavel).filter(Boolean))]
  const opcoesVeiculo = [...new Set(veiculos
    .map((veiculo) => veiculo.identification || veiculo.model || veiculo.license_plate)
    .filter(Boolean))]

  const secoesFiltro = [
    { id: 'unidade', label: 'Unidade', options: opcoesUnidade.map((value) => ({ value, label: value })) },
    { id: 'responsavel', label: 'Motorista', options: opcoesMotorista.map((value) => ({ value, label: value })) },
    { id: 'transporte', label: 'Veiculo', options: opcoesVeiculo.map((value) => ({ value, label: value })) },
  ]

  const alternarFiltro = (secao, valor) => {
    setFiltrosRascunho((atual) => {
      const valores = atual[secao] || []
      const existe = valores.includes(valor)
      return {
        ...atual,
        [secao]: existe ? valores.filter((item) => item !== valor) : [...valores, valor],
      }
    })
  }

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtrosRascunho)
    setFiltroAberto(false)
  }

  const limparFiltros = () => {
    const vazio = { unidade: [], responsavel: [], transporte: [] }
    setFiltrosRascunho(vazio)
    setFiltrosAplicados(vazio)
  }

  const abrirFiltros = () => {
    setFiltrosRascunho(filtrosAplicados)
    setFiltroAberto((atual) => !atual)
  }

  const alunosFiltrados = alunos.filter((aluno) => {
    const nome = aluno.name || aluno.nome || ''
    const rm = aluno.rm || ''
    const responsavel = aluno.responsible_name || aluno.responsavel || ''
    const unidade = aluno.unit || aluno.unidade || ''
    const transporte = aluno.transport_identification || aluno.transporte || ''
    const contato = aluno.parent_contact || aluno.contato_responsavel || ''
    const endereco = aluno.address || aluno.endereco || ''

    const termo = busca.trim().toLowerCase()
    const passouBusca =
      !termo ||
      [nome, rm, responsavel, unidade, transporte, contato, endereco]
        .some((valor) => valor.toLowerCase().includes(termo))

    const passouUnidade = filtrosAplicados.unidade.length === 0 || filtrosAplicados.unidade.includes(unidade)
    const passouResponsavel = filtrosAplicados.responsavel.length === 0 || filtrosAplicados.responsavel.includes(responsavel)
    const passouTransporte = filtrosAplicados.transporte.length === 0 || filtrosAplicados.transporte.includes(transporte)

    return passouBusca && passouUnidade && passouResponsavel && passouTransporte
  })

  return (
    <main className={`${styles['admin-page']} ${styles['admin-page--alunos']}`}>
      <div className="ui-header">
        <div className={styles.logo}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <img src={student3} alt="" className={styles['ui-header-extra-icon']} />
            <span>Alunos</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <div className={styles['adicionar']}>
        <button type="button" className={styles['adicionar-botao']} onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Aluno
        </button>
      </div>

      {formularioAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharAdicionar}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            {passoCadastro === 1 && (
              <div className={styles['boadd-top']}>
                <PhotoUpload
                  photoUrl={novoAluno.fotoUrl}
                  onPhotoChange={handlePhotoChange}
                  onUploadingChange={setPhotoUploading}
                  entityType="student"
                  entityId={alunoEmEdicao?.id}
                  userName={novoAluno.nome}
                />
              </div>
            )}

            <form className={styles['boadd-form']} onSubmit={enviarNovoAluno}>
              {passoCadastro === 1 ? (
                <>
                  <input type="text" placeholder="Digite o nome do aluno" value={novoAluno.nome} onChange={atualizarCampo('nome')} required />
                  <input type="text" placeholder="Insira o RM do aluno" value={novoAluno.rm} onChange={atualizarCampo('rm')} inputMode="numeric" maxLength={12} required />
                  <input type="text" placeholder="Nome do responsavel" value={novoAluno.responsavel} onChange={atualizarCampo('responsavel')} required />
                  <input type="text" placeholder="Contato do responsavel" value={novoAluno.contatoResponsavel} onChange={atualizarCampo('contatoResponsavel')} inputMode="tel" maxLength={15} required />

                  <select value={novoAluno.transporte} onChange={atualizarCampo('transporte')} required>
                    <option value="">Identificacao do transporte</option>
                    {opcoesVeiculo.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>

                  <div className={styles['boadd-unidade']}>
                    <p>Unidade:</p>
                    <label>
                      <input type="radio" name="unidade" value="Garcia" checked={novoAluno.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} required />
                      Garcia
                    </label>
                    <label>
                      <input type="radio" name="unidade" value="Vila Mimosa" checked={novoAluno.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} required />
                      Mimosa
                    </label>
                    <label>
                      <input type="radio" name="unidade" value="Swiss Park" checked={novoAluno.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} required />
                      Swiss Park
                    </label>
                    <label>
                      <input type="radio" name="unidade" value="Vivendo e Aprendendo" checked={novoAluno.unidade === 'Vivendo e Aprendendo'} onChange={atualizarCampo('unidade')} required />
                      Vivendo e Aprendendo
                    </label>
                  </div>

                  <button type="button" className={styles['boadd-confirmar']} onClick={avancarParaEndereco} disabled={photoUploading}>
                    {photoUploading ? 'Aguardando upload...' : 'Continuar'}
                  </button>
                  <button type="button" className={styles['boadd-cancelar']} onClick={fecharAdicionar}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <h2 className={styles['boadd-titulo']}>Endereco do Aluno</h2>

                  <label className={styles['boadd-label']}>
                    CEP:
                    <div className={styles['boadd-cep-linha']}>
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={enderecoForm.cep}
                        onChange={atualizarEndereco('cep')}
                        onBlur={buscarEnderecoPorCep}
                        onKeyDown={handleCepKeyDown}
                        inputMode="numeric"
                        maxLength={9}
                        required
                      />
                      <button type="button" className={styles['boadd-buscar-cep']} onClick={buscarEnderecoPorCep} disabled={buscandoCep}>
                        {buscandoCep ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                  </label>

                  <input type="text" placeholder="Rua / Logradouro" value={enderecoForm.rua} onChange={atualizarEndereco('rua')} required />

                  <div className={styles['boadd-linha-dupla']}>
                    <input type="text" placeholder="Numero" value={enderecoForm.numero} onChange={atualizarEndereco('numero')} required />
                    <input type="text" placeholder="Complemento (opcional)" value={enderecoForm.complemento} onChange={atualizarEndereco('complemento')} />
                  </div>

                  <input type="text" placeholder="Bairro" value={enderecoForm.bairro} onChange={atualizarEndereco('bairro')} required />

                  <div className={styles['boadd-linha-dupla']}>
                    <input type="text" placeholder="Cidade" value={enderecoForm.cidade} onChange={atualizarEndereco('cidade')} required />
                    <input type="text" placeholder="UF" value={enderecoForm.estado} onChange={atualizarEndereco('estado')} maxLength={2} required className={styles['boadd-uf']} />
                  </div>

                  <MiniMap latitude={novoAluno.latitude} longitude={novoAluno.longitude} height={140} />

                  <button type="submit" className={styles['boadd-confirmar']} disabled={photoUploading || formSubmitting}>
                    {photoUploading ? 'Aguardando upload...' : formSubmitting ? 'Criando...' : 'Criar Cadastro'}
                  </button>
                  <button type="button" className={styles['boadd-voltar']} onClick={voltarParaDadosBasicos}>
                    Voltar
                  </button>
                  <button type="button" className={styles['boadd-cancelar']} onClick={fecharAdicionar}>
                    Cancelar
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {editorAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharEditor}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['boadd-top']}>
              <PhotoUpload
                photoUrl={novoAluno.fotoUrl}
                onPhotoChange={handlePhotoChange}
                onUploadingChange={setPhotoUploading}
                entityType="student"
                entityId={alunoEmEdicao?.id}
                userName={novoAluno.nome}
              />
            </div>

            <form className={styles['boadd-form']} onSubmit={salvarEdicaoAluno}>
              <input type="text" placeholder="Digite o nome do aluno" value={novoAluno.nome} onChange={atualizarCampo('nome')} required />
              <input type="text" placeholder="Insira o RM do aluno" value={novoAluno.rm} onChange={atualizarCampo('rm')} inputMode="numeric" maxLength={12} required />
              <input type="text" placeholder="Nome do responsavel" value={novoAluno.responsavel} onChange={atualizarCampo('responsavel')} required />
              <input type="text" placeholder="Contato do responsavel" value={novoAluno.contatoResponsavel} onChange={atualizarCampo('contatoResponsavel')} inputMode="tel" maxLength={15} required />
              <AddressAutocompleteInput
                value={novoAluno.endereco}
                onChange={alterarEnderecoDigitado}
                onSelectPlace={selecionarEnderecoAutocomplete}
                placeholder="Endereco do aluno"
                required
              />

              <select value={novoAluno.transporte} onChange={atualizarCampo('transporte')} required>
                <option value="">Identificacao do transporte</option>
                {opcoesVeiculo.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>

              <div className={styles['boadd-unidade']}>
                <p>Unidade:</p>
                <label>
                  <input type="radio" name="unidade-edicao" value="Garcia" checked={novoAluno.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} required />
                  Garcia
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Vila Mimosa" checked={novoAluno.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} required />
                  Mimosa
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Swiss Park" checked={novoAluno.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} required />
                  Swiss Park
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Vivendo e Aprendendo" checked={novoAluno.unidade === 'Vivendo e Aprendendo'} onChange={atualizarCampo('unidade')} required />
                  Vivendo e Aprendendo
                </label>
              </div>

              <button type="submit" className={styles['boadd-confirmar']} disabled={photoUploading || formSubmitting}>
                {photoUploading ? 'Aguardando upload...' : formSubmitting ? 'Salvando...' : 'Salvar Alteracoes'}
              </button>
              <button type="button" className={styles['boadd-cancelar']} onClick={fecharEditor}>Cancelar</button>
            </form>
          </div>
        </div>
      )}

      <div className={styles['cadastros']}>
        <div className={styles['filtro-area']}>
          <div className={styles['filtro']}>
            <div className={styles['filtro-input-wrap']}>
              <Search className={styles['filtro-icon']} />
              <input
                type="text"
                placeholder="Buscar aluno"
                className={styles['filtro-input']}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button type="button" className={styles['filtro-botao']} onClick={abrirFiltros}>
              <ArrowDownNarrowWide className={styles['icone-filtro']} />
              <span className={styles['busca-filtro']}>Filtrar Por...</span>
            </button>
          </div>

          <FilterPanel
            open={filtroAberto}
            title="Filtre por..."
            sections={secoesFiltro}
            draftFilters={filtrosRascunho}
            onToggle={alternarFiltro}
            onApply={aplicarFiltros}
            onClear={limparFiltros}
            onClose={() => setFiltroAberto(false)}
          />
        </div>

        <div className={styles['alunos-grid']}>
          {alunosFiltrados.map((aluno) => (
            <div key={aluno.id} className={styles['aluno-item']}>
              <div
                className={`${styles.aluno} ${styles[`aluno${aluno.id}`]} ${alunoAberto === aluno.id ? styles.aberto : ''}`}
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
                {alunoAberto === aluno.id ? <ChevronDown className={styles['setinha']} /> : <ChevronRight className={styles['setinha']} />}
                <h1>{aluno.name || aluno.nome}</h1>
                <div className={styles['item-acoes']} ref={menuAberto === aluno.id ? menuRef : null}>
                  <button
                    type="button"
                    className={styles['item-acoes-trigger']}
                    aria-haspopup="menu"
                    aria-expanded={menuAberto === aluno.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuAberto((atual) => (atual === aluno.id ? null : aluno.id))
                    }}
                  >
                    &#8801;
                  </button>

                  {menuAberto === aluno.id && (
                    <div className={styles['item-acoes-popover']} role="menu">
                      <button type="button" onClick={() => abrirEditor(aluno)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => excluirAluno(aluno)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {alunoAberto === aluno.id && (
                <div className={styles['aluno-detalhes']}>
                  <div className={styles['aluno-card-top']}>
                    <div className={styles['aluno-foto']}>
                      {aluno.photo_url ? (
                        <img src={aluno.photo_url} alt={aluno.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#999', fontSize: '24px' }}>📷</span>
                      )}
                    </div>
                    <div className={styles['aluno-info']}>
                      <p><strong>RM:</strong> {aluno.rm || 'Não informado'}</p>
                      <p><strong>Unidade:</strong> {aluno.unit || aluno.unidade || 'Não informada'}</p>
                      <p><strong>Transporte:</strong> {aluno.transport_identification || aluno.transporte || 'Não informado'}</p>
                      <p><strong>Responsável:</strong> {aluno.responsible_name || aluno.responsavel || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className={styles['aluno-info-extra']}>
                    <p><strong>Contato do responsável:</strong> {aluno.parent_contact || aluno.contato_responsavel || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> {aluno.address || aluno.endereco}</p>
                  </div>
                  <div className={styles['aluno-mapa']}>
                    <MiniMap latitude={aluno.latitude} longitude={aluno.longitude} />
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

export default GerenciarAlunos