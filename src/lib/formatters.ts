export const formatCLP = (n: number): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

export const formatDate = (
  dateStr: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', opts);
