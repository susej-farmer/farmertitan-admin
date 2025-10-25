export function formatDate(dateString) {
  if (!dateString) return null
  
  try {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0] // Canadian format: yyyy-mm-dd
  } catch (error) {
    return 'Invalid Date'
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return 'N/A'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export function formatNumber(number, decimals = 0) {
  if (number === null || number === undefined) return 'N/A'
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number)
}