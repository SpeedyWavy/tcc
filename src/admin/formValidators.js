export const onlyDigits = (value, maxLength) => {
  const digits = String(value || '').replace(/\D/g, '')
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits
}

export const formatCpf = (value) => {
  const digits = onlyDigits(value, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export const formatPhone = (value) => {
  const digits = onlyDigits(value, 11)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const formatPlate = (value) => {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)

  if (normalized.length <= 3) {
    return normalized
  }

  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`
}

export const isCpfComplete = (value) => onlyDigits(value).length === 11

export const isPhoneComplete = (value) => {
  const length = onlyDigits(value).length
  return length === 10 || length === 11
}

export const isPlateComplete = (value) => {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9]/g, '')
  return normalized.length === 7 && /\d/.test(normalized) && /[a-zA-Z]/.test(normalized)
}
