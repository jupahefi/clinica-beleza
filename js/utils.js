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
 * Obtiene el ID del profesional actual del contexto de sesión
 * @returns {number} ID del profesional actual o 1 como fallback
 */
export function getCurrentProfesionalId() {
    try {
        const userData = localStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            return user.profesional_id || user.id || 1;
        }
        
        const profesionalData = localStorage.getItem('profesionalData');
        if (profesionalData) {
            const profesional = JSON.parse(profesionalData);
            return profesional.id || 1;
        }
        
        // Fallback - idealmente esto debería mostrar una advertencia
        console.warn('⚠️ No se pudo obtener profesional_id del contexto, usando fallback');
        return 1;
    } catch (error) {
        console.error('❌ Error obteniendo profesional_id:', error);
        return 1;
    }
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
 * Formatea un precio en pesos chilenos (alias para compatibilidad)
 */
export function formatCurrency(precio) {
  return formatearPrecio(precio);
}

/**
 * Formatea una fecha en formato chileno
 */
export function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-CL');
}

/**
 * Formatea una fecha en formato chileno (alias para compatibilidad)
 */
export function formatDate(fecha) {
  return formatearFecha(fecha);
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
 * Muestra una notificación al usuario
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación (info, success, warning, error)
 */
export function mostrarNotificacion(mensaje, tipo = 'info') {
    // Implementación de notificaciones
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    
    // Si existe una función de notificación global, usarla
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(mensaje, tipo);
    }
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
 * Calcula el dígito verificador usando módulo 11
 */
export function calcularDvRut(rutSinDv) {
  const rutNumerico = rutSinDv.replace(/\D/g, '');
  let suma = 0;
  let multiplo = 2;
  
  for (let i = rutNumerico.length - 1; i >= 0; i--) {
    suma += parseInt(rutNumerico.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const dvCalculado = 11 - (suma % 11);
  return dvCalculado === 11 ? '0' : dvCalculado === 10 ? 'K' : dvCalculado.toString();
}

/**
 * Valida RUT chileno usando módulo 11
 */
export function validarRut(rut) {
  if (!rut) return false;
  
  // Limpiar RUT: solo números y K
  const rutLimpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  // Validar formato básico (7 a 9 dígitos + DV)
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  // Validar que el cuerpo sean solo números
  if (!/^\d+$/.test(cuerpo)) return false;
  
  // El cuerpo debe tener entre 7 y 8 dígitos
  if (cuerpo.length < 7 || cuerpo.length > 8) return false;
  
  // Calcular DV esperado
  const dvEsperado = calcularDvRut(cuerpo);
  
  return dv === dvEsperado;
}

/**
 * Formatea RUT con puntos y guión automáticamente
 */
export function formatearRut(rut) {
  if (!rut) return '';
  
  // Limpiar: solo números y K
  const rutLimpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (rutLimpio.length === 0) return '';
  
  // Si tiene menos de 2 caracteres, devolver como está
  if (rutLimpio.length < 2) return rutLimpio;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  // Formatear cuerpo con puntos cada 3 dígitos desde la derecha
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Auto-completar RUT con dígito verificador
 */
export function autocompletarRut(rutIncompleto) {
  if (!rutIncompleto) return '';
  
  // Limpiar entrada
  const soloNumeros = rutIncompleto.replace(/\D/g, '');
  
  // Si tiene menos de 7 dígitos, no calcular DV aún
  if (soloNumeros.length < 7) {
    return formatearRut(soloNumeros);
  }
  
  // Si ya tiene 8 o 9 dígitos, no modificar (ya tiene DV)
  if (soloNumeros.length >= 8) {
    return formatearRut(rutIncompleto);
  }
  
  // Si tiene exactamente 7 dígitos, calcular y agregar DV automáticamente
  if (soloNumeros.length === 7) {
    const dv = calcularDvRut(soloNumeros);
    const rutCompleto = soloNumeros + dv;
    return formatearRut(rutCompleto);
  }
  
  return formatearRut(rutIncompleto);
}

/**
 * Formatea email automáticamente
 */
export function formatearEmail(email) {
  if (!email) return '';
  
  // Convertir a minúsculas y limpiar espacios
  return email.toLowerCase().trim();
}

/**
 * Valida email con reglas más estrictas
 */
export function validarEmail(email) {
  if (!email) return false;
  
  const emailLimpio = email.toLowerCase().trim();
  
  // Regex más completa para email
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!regex.test(emailLimpio)) {
    return false;
  }
  
  // Validaciones adicionales
  const partes = emailLimpio.split('@');
  if (partes.length !== 2) return false;
  
  const [usuario, dominio] = partes;
  
  // Usuario no puede estar vacío o ser muy largo
  if (usuario.length === 0 || usuario.length > 64) return false;
  
  // Dominio debe tener al menos un punto
  if (!dominio.includes('.')) return false;
  
  // Dominio no puede empezar o terminar con punto o guión
  if (dominio.startsWith('.') || dominio.endsWith('.') || 
      dominio.startsWith('-') || dominio.endsWith('-')) return false;
  
  return true;
}

/**
 * Detecta errores comunes en emails y sugiere correcciones
 */
export function sugerirEmail(email) {
  if (!email) return null;
  
  const emailLimpio = email.toLowerCase().trim();
  
  // Dominios comunes mal escritos
  const correccionesDominio = {
    'gmail.com': ['gmai.com', 'gmail.co', 'gmial.com', 'gmaill.com', 'gmail.con'],
    'hotmail.com': ['hotmial.com', 'hotmai.com', 'hotmail.co', 'hotmil.com'],
    'yahoo.com': ['yahoo.co', 'yaho.com', 'yahho.com', 'yahooo.com'],
    'outlook.com': ['outlook.co', 'outlok.com', 'outook.com'],
    'live.com': ['live.co', 'liv.com'],
    'icloud.com': ['iclou.com', 'icloud.co', 'icoud.com']
  };
  
  // Verificar si falta @ 
  if (!emailLimpio.includes('@')) {
    // Si parece tener un dominio pero falta @
    const dominiosComunes = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
    for (const dominio of dominiosComunes) {
      if (emailLimpio.includes(dominio.replace('.', ''))) {
        return emailLimpio.replace(dominio.replace('.', ''), '@' + dominio);
      }
    }
    return null;
  }
  
  const partes = emailLimpio.split('@');
  if (partes.length !== 2) return null;
  
  const [usuario, dominio] = partes;
  
  // Buscar corrección de dominio
  for (const [dominioCorreto, variantes] of Object.entries(correccionesDominio)) {
    if (variantes.includes(dominio)) {
      return `${usuario}@${dominioCorreto}`;
    }
  }
  
  // Verificar errores comunes
  if (dominio.endsWith('.co') && !dominio.endsWith('.com.co')) {
    return `${usuario}@${dominio}m`; // Probablemente quiso decir .com
  }
  
  if (dominio.endsWith('.con')) {
    return `${usuario}@${dominio.replace('.con', '.com')}`;
  }
  
  return null;
}

/**
 * Valida formato de email en tiempo real
 */
export function validarEmailTiempoReal(email) {
  if (!email) return { valido: true, mensaje: '' };
  
  const emailLimpio = email.toLowerCase().trim();
  
  // Verificar caracteres básicos
  if (!/^[a-zA-Z0-9.@_-]*$/.test(emailLimpio)) {
    return { valido: false, mensaje: 'Contiene caracteres no válidos' };
  }
  
  // Verificar múltiples @
  const cantidadArroba = (emailLimpio.match(/@/g) || []).length;
  if (cantidadArroba > 1) {
    return { valido: false, mensaje: 'Solo puede tener un @' };
  }
  
  // Si tiene @, verificar estructura básica
  if (emailLimpio.includes('@')) {
    const partes = emailLimpio.split('@');
    if (partes[0].length === 0) {
      return { valido: false, mensaje: 'Falta nombre de usuario' };
    }
    if (partes[1].length === 0) {
      return { valido: false, mensaje: 'Falta dominio' };
    }
  }
  
  return { valido: true, mensaje: '' };
}

/**
 * Formatea teléfono chileno automáticamente
 */
export function formatearTelefono(telefono) {
  if (!telefono) return '';
  
  // Limpiar: solo números
  let soloNumeros = telefono.replace(/\D/g, '');
  
  // Si empieza con 56, remover el prefijo del país para formatear
  if (soloNumeros.startsWith('56')) {
    soloNumeros = soloNumeros.slice(2);
  }
  
  if (soloNumeros.length === 0) return '';
  
  // Formatear según la longitud para móviles y fijos chilenos
  if (soloNumeros.length <= 1) {
    return soloNumeros;
  } else if (soloNumeros.length <= 4) {
    return soloNumeros;
  } else if (soloNumeros.length <= 8) {
    // Hasta 8 dígitos: X XXXX XXXX
    const parte1 = soloNumeros.slice(0, 1);
    const parte2 = soloNumeros.slice(1, 5);
    const parte3 = soloNumeros.slice(5);
    
    if (soloNumeros.length <= 5) {
      return `${parte1} ${parte2}`;
    } else {
      return `${parte1} ${parte2} ${parte3}`;
    }
  } else if (soloNumeros.length === 9) {
    // 9 dígitos (móvil): 9 XXXX XXXX
    const codigo = soloNumeros.slice(0, 1);
    const parte1 = soloNumeros.slice(1, 5);
    const parte2 = soloNumeros.slice(5, 9);
    return `${codigo} ${parte1} ${parte2}`;
  } else {
    // Muy largo, cortar a 9 dígitos
    const recortado = soloNumeros.slice(0, 9);
    const codigo = recortado.slice(0, 1);
    const parte1 = recortado.slice(1, 5);
    const parte2 = recortado.slice(5, 9);
    return `${codigo} ${parte1} ${parte2}`;
  }
}

/**
 * Valida teléfono chileno
 */
export function validarTelefono(telefono) {
  if (!telefono) return false;
  
  // Limpiar números
  const soloNumeros = telefono.replace(/\D/g, '');
  
  // Verificar formatos válidos:
  // +56 9 1234 5678 (móvil)
  // +56 2 1234 5678 (fijo Santiago)
  // +56 XX 123 4567 (fijo regiones)
  
  let numeroSinPrefijo = soloNumeros;
  
  // Remover prefijo +56 si existe
  if (numeroSinPrefijo.startsWith('56')) {
    numeroSinPrefijo = numeroSinPrefijo.slice(2);
  }
  
  // Validar longitud (8 o 9 dígitos)
  if (numeroSinPrefijo.length < 8 || numeroSinPrefijo.length > 9) {
    return false;
  }
  
  // Validar móviles (empiezan con 9 y tienen 9 dígitos)
  if (numeroSinPrefijo.startsWith('9') && numeroSinPrefijo.length === 9) {
    return true;
  }
  
  // Validar fijos (8 dígitos, primer dígito 2-9)
  if (numeroSinPrefijo.length === 8 && /^[2-9]/.test(numeroSinPrefijo)) {
    return true;
  }
  
  return false;
}

/**
 * Detecta y corrige errores comunes en teléfonos
 */
export function sugerirTelefono(telefono) {
  const soloNumeros = telefono.replace(/\D/g, '');
  
  // Si es muy corto o muy largo
  if (soloNumeros.length < 8) {
    return null; // Muy corto para sugerir
  }
  
  // Si empieza con 9 pero le falta un dígito (móvil)
  if (soloNumeros.startsWith('9') && soloNumeros.length === 8) {
    // Podría faltarle un dígito al final
    return null; // No podemos adivinar el dígito faltante
  }
  
  // Si no empieza con 56 pero parece móvil completo
  if (soloNumeros.length === 9 && soloNumeros.startsWith('9')) {
    return formatearTelefono('56' + soloNumeros);
  }
  
  // Si es un fijo pero le falta el código de área
  if (soloNumeros.length === 7) {
    return formatearTelefono('562' + soloNumeros); // Asumir Santiago
  }
  
  return null;
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
  // Crear contenedor de notificaciones si no existe
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }
  
  // Crear toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${tipo === 'error' ? '#f8d7da' : tipo === 'success' ? '#d4edda' : tipo === 'warning' ? '#fff3cd' : '#d1ecf1'};
    color: ${tipo === 'error' ? '#721c24' : tipo === 'success' ? '#155724' : tipo === 'warning' ? '#856404' : '#0c5460'};
    border: 1px solid ${tipo === 'error' ? '#f5c6cb' : tipo === 'success' ? '#c3e6cb' : tipo === 'warning' ? '#ffeaa7' : '#bee5eb'};
    border-radius: 8px;
    padding: 15px 20px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    line-height: 1.4;
    max-width: 100%;
    word-wrap: break-word;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  // Icono según tipo
  const iconos = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <span style="font-size: 16px;">${iconos[tipo] || iconos.info}</span>
      <div style="flex: 1;">
        <div style="white-space: pre-line;">${mensaje}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        padding: 0;
        margin-left: 10px;
      ">×</button>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto-remover después de 5 segundos (excepto errores que duran más)
  const duracion = tipo === 'error' ? 8000 : 5000;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duracion);
}

/**
 * Muestra notificación/alerta personalizada (alias para compatibilidad)
 */
export function showMessage(mensaje, tipo = 'info') {
  return mostrarNotificacion(mensaje, tipo);
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
