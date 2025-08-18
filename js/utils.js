/**
 * Utilidades y funciones auxiliares del sistema
 */

let contadorIds = parseInt(localStorage.getItem('contadorIds') || '1');

/**
 * Genera un nuevo ID único para las entidades
 */
export function generarId() {
  return contadorIds++;
}

/**
 * Guarda el contador de IDs en localStorage
 */
export function guardarContadorIds() {
  localStorage.setItem('contadorIds', contadorIds.toString());
}

/**
 * Formatea un precio en pesos chilenos
 */
export function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(precio);
}

/**
 * Formatea una fecha en formato chileno
 */
export function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-CL');
}

/**
 * Formatea fecha y hora
 */
export function formatearFechaHora(fecha) {
  const date = new Date(fecha);
  return `${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
}

/**
 * Obtiene la fecha actual en formato ISO
 */
export function fechaActual() {
  return new Date().toISOString();
}

/**
 * Obtiene la fecha actual en formato para input date
 */
export function fechaActualInput() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Valida si una fecha está en el rango válido
 */
export function validarFecha(fecha, fechaInicio = null, fechaFin = null) {
  const date = new Date(fecha);
  const hoy = new Date();
  
  if (date < hoy && !fechaInicio) return false;
  if (fechaInicio && date < new Date(fechaInicio)) return false;
  if (fechaFin && date > new Date(fechaFin)) return false;
  
  return true;
}

/**
 * Capitaliza la primera letra de una cadena
 */
export function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/**
 * Valida RUT chileno
 */
export function validarRut(rut) {
  if (!rut) return false;
  
  // Remover puntos y guión
  const rutLimpio = rut.replace(/\./g, '').replace('-', '');
  
  // Validar formato básico
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toLowerCase();
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplo = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const dvCalculado = 11 - (suma % 11);
  const dvFinal = dvCalculado === 11 ? '0' : dvCalculado === 10 ? 'k' : dvCalculado.toString();
  
  return dv === dvFinal;
}

/**
 * Formatea RUT con puntos y guión
 */
export function formatearRut(rut) {
  if (!rut) return '';
  
  const rutLimpio = rut.replace(/\./g, '').replace('-', '');
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  // Agregar puntos cada 3 dígitos desde la derecha
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Valida email
 */
export function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida teléfono chileno
 */
export function validarTelefono(telefono) {
  const regex = /^\+?56\s?[9]\s?\d{4}\s?\d{4}$/;
  return regex.test(telefono.replace(/\s/g, ''));
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function diferenciaEnDias(fecha1, fecha2) {
  const date1 = new Date(fecha1);
  const date2 = new Date(fecha2);
  const diferencia = Math.abs(date2 - date1);
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una oferta está vigente
 */
export function ofertaVigente(fechaInicio, fechaFin) {
  const hoy = new Date().toISOString().split('T')[0];
  return hoy >= fechaInicio && hoy <= fechaFin;
}

/**
 * Debounce para optimizar búsquedas
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Muestra notificación/alerta personalizada
 */
export function mostrarNotificacion(mensaje, tipo = 'info') {
  // Por simplicidad usamos alert, pero se puede expandir a un sistema de notificaciones
  alert(mensaje);
}

/**
 * Copia texto al portapapeles
 */
export async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarNotificacion('Copiado al portapapeles');
  } catch (err) {
    console.error('Error al copiar:', err);
  }
}

/**
 * Exporta datos a CSV
 */
export function exportarCSV(datos, nombreArchivo) {
  if (!datos.length) return;
  
  const headers = Object.keys(datos[0]);
  const csvContent = [
    headers.join(','),
    ...datos.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
