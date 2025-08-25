/**
 * Módulo de Fichas Específicas
 * Maneja fichas de depilación y corporal/facial
 */

import { formatCurrency, formatDate, getCurrentProfesionalId, mostrarNotificacion } from '../utils.js';
import { ConsentimientoModal } from '../components/SignaturePad.js';
import { fichasEspecificasAPI, zonasAPI } from '../api-client.js';

export class FichasEspecificasModule {
    constructor() {
        this.consentimientoModal = new ConsentimientoModal();
        this.zonas = [];
        this.init();
    }
    
    async init() {
        await this.cargarZonas();
        this.setupEventListeners();
        this.loadConsentimientoText();
    }
    
    async cargarZonas() {
        try {
            // Importar zonasAPI dinámicamente
            const { zonasAPI } = await import('../api-client.js');
            this.zonas = await zonasAPI.getAll();
                    } catch (error) {
            console.error('❌ Error cargando zonas:', error);
            mostrarNotificacion('Error cargando zonas: ' + (error?.message || 'Error desconocido'), 'error');
            this.zonas = [];
        }
    }
    
    setupEventListeners() {
        // Event listeners para fichas específicas
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFichasEspecificasCheckboxes();
            this.setupZonasSelector();
        });
    }
    
    setupFichasEspecificasCheckboxes() {
        const checkboxes = document.querySelectorAll('input[name="fichasEspecificas"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleFichaEspecifica(e.target.id);
            });
        });
    }
    
    toggleFichaEspecifica(fichaId) {
        const card = document.getElementById(fichaId + 'Card');
        if (card) {
            if (document.getElementById(fichaId).checked) {
                card.classList.remove('hidden');
                card.style.display = 'block';
            } else {
                card.classList.add('hidden');
                card.style.display = 'none';
            }
        }
    }
    
    setupZonasSelector() {
        // Crear selector de zonas para depilación
        const zonasContainer = document.getElementById('zonasDepilacion');
        if (zonasContainer) {
            this.createZonasSelector(zonasContainer);
        }
    }
    
    createZonasSelector(container) {
        container.innerHTML = '';
        
        if (!this.zonas || this.zonas.length === 0) {
            container.innerHTML = '<p>Cargando zonas...</p>';
            return;
        }
        
        const zonasGrid = document.createElement('div');
        zonasGrid.className = 'zonas-grid';
        zonasGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        `;
        
        this.zonas.forEach(zona => {
            const zonaItem = document.createElement('div');
            zonaItem.className = 'zona-item';
            zonaItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                border: 2px solid #e9ecef;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `zona_${zona.codigo}`;
            checkbox.dataset.zona = zona.codigo;
            checkbox.dataset.precio = zona.precio_base;
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `zona_${zona.codigo}`;
            labelElement.textContent = zona.nombre;
            labelElement.style.cursor = 'pointer';
            
            const precioSpan = document.createElement('span');
            precioSpan.textContent = formatCurrency(zona.precio_base);
            precioSpan.style.cssText = `
                margin-left: auto;
                font-size: 12px;
                color: #666;
                font-weight: 500;
            `;
            
            zonaItem.appendChild(checkbox);
            zonaItem.appendChild(labelElement);
            zonaItem.appendChild(precioSpan);
            
            // Event listeners
            checkbox.addEventListener('change', () => this.updateZonasSeleccionadas());
            zonaItem.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.updateZonasSeleccionadas();
                }
            });
            
            zonasGrid.appendChild(zonaItem);
        });
        
        container.appendChild(zonasGrid);
        
        // Agregar resumen de zonas seleccionadas
        const resumenDiv = document.createElement('div');
        resumenDiv.id = 'zonas-resumen';
        resumenDiv.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
            font-size: 14px;
        `;
        container.appendChild(resumenDiv);
    }
    
    updateZonasSeleccionadas() {
        const checkboxes = document.querySelectorAll('input[data-zona]:checked');
        const zonasSeleccionadas = Array.from(checkboxes).map(cb => {
            const zona = this.zonas.find(z => z.codigo === cb.dataset.zona);
            return {
                zona: cb.dataset.zona,
                label: zona ? zona.nombre : cb.dataset.zona,
                precio: parseInt(cb.dataset.precio)
            };
        });
        
        const resumenDiv = document.getElementById('zonas-resumen');
        if (resumenDiv) {
            if (zonasSeleccionadas.length > 0) {
                const total = zonasSeleccionadas.reduce((sum, zona) => sum + zona.precio, 0);
                resumenDiv.innerHTML = `
                    <strong>Zonas seleccionadas (${zonasSeleccionadas.length}):</strong><br>
                    ${zonasSeleccionadas.map(z => `• ${z.label} - ${formatCurrency(z.precio)}`).join('<br>')}<br>
                    <strong>Total: ${formatCurrency(total)}</strong>
                `;
            } else {
                resumenDiv.innerHTML = '<em>No hay zonas seleccionadas</em>';
            }
        }
        
        // Actualizar el campo de texto oculto
        const zonasTextarea = document.getElementById('zonasDepilacion');
        if (zonasTextarea && zonasTextarea.tagName === 'TEXTAREA') {
            zonasTextarea.value = zonasSeleccionadas.map(z => z.label).join(', ');
        }
    }
    
    async loadConsentimientoText() {
        try {
            const response = await fetch('docs/consentimiento_depilacion.htm');
            const html = await response.text();
            
            // Extraer el texto del HTML (simplificado)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const textContent = doc.body.textContent || doc.body.innerText || '';
            
            this.consentimientoText = textContent.trim();
        } catch (error) {
            console.warn('No se pudo cargar el consentimiento:', error);
            const errorMessage = error.message || 'Error desconocido cargando consentimiento';
            mostrarNotificacion('No se pudo cargar el consentimiento: ' + errorMessage, 'warning');
            this.consentimientoText = this.getDefaultConsentimientoText();
        }
    }
    
    getDefaultConsentimientoText() {
        return `
CONSENTIMIENTO INFORMADO - DEPILACIÓN LÁSER

He sido informado/a sobre el procedimiento de depilación láser y entiendo que:

1. El láser actúa sobre el folículo piloso para reducir el crecimiento del vello
2. Se requieren múltiples sesiones para resultados óptimos
3. Los resultados varían según el tipo de piel y color del vello
4. Pueden existir efectos secundarios temporales como enrojecimiento o inflamación
5. Es importante evitar la exposición solar antes y después del tratamiento
6. Debo informar sobre cualquier cambio en mi estado de salud

Declaro que:
- He leído y comprendido toda la información proporcionada
- He tenido la oportunidad de hacer preguntas
- Consiento voluntariamente al tratamiento
- Entiendo que los resultados no están garantizados
- Me comprometo a seguir las indicaciones post-tratamiento

Fecha: ${new Date().toLocaleDateString()}
        `;
    }
    
    showConsentimiento(onAccept, onReject) {
        this.consentimientoModal.show(
            this.consentimientoText,
            async (signatureBlob) => {
                                mostrarNotificacion('Consentimiento aceptado y firmado correctamente.', 'success');
                if (onAccept) await onAccept(signatureBlob);
            },
            () => {
                                mostrarNotificacion('Consentimiento rechazado por el paciente.', 'warning');
                if (onReject) onReject();
            }
        );
    }
    
    // Métodos para gestionar fichas específicas
    async saveFirmaDigital(fichaId, signatureBlob, tipoConsentimiento = 'depilacion') {
        try {
            const formData = new FormData();
            formData.append('ficha_id', fichaId);
            formData.append('tipo_consentimiento', tipoConsentimiento);
            formData.append('firma_blob', signatureBlob, 'firma.png');
            formData.append('tipo_archivo', 'png');
            formData.append('profesional_id', getCurrentProfesionalId());
            
            const response = await fichasEspecificasAPI.saveConsentimientoFirma(formData);
            
            if (response.success) {
                                mostrarNotificacion('Firma digital guardada correctamente.', 'success');
                return response.data;
            } else {
                // Mostrar el error de la db si viene
                const dbError = response?.error || 'Error guardando firma digital';
                console.error('❌ Error guardando firma digital:', dbError);
                mostrarNotificacion('Error guardando firma digital: ' + dbError, 'error');
                throw new Error(dbError);
            }
        } catch (error) {
            // Si el error viene de la db, mostrarlo tal cual
            const errorMessage = error?.message || 'Error desconocido guardando firma digital';
            console.error('❌ Error guardando firma digital:', errorMessage);
            mostrarNotificacion('Error guardando firma digital: ' + errorMessage, 'error');
            throw new Error(errorMessage);
        }
    }
    
    async verificarConsentimientoFirmado(fichaId, tipoConsentimiento = 'depilacion') {
        try {
            const response = await fichasEspecificasAPI.getConsentimientoFirma(fichaId, tipoConsentimiento);
            
            if (response.success) {
                                return response.data;
            } else {
                const dbError = response?.error || 'No se encontró consentimiento firmado';
                console.warn('⚠️ No se encontró consentimiento firmado:', dbError);
                mostrarNotificacion('No se encontró consentimiento firmado: ' + dbError, 'warning');
                return null;
            }
        } catch (error) {
            const errorMessage = error?.message || 'Error desconocido verificando consentimiento';
            console.error('❌ Error verificando consentimiento:', errorMessage);
            mostrarNotificacion('Error verificando consentimiento: ' + errorMessage, 'error');
            return null;
        }
    }
    
    async saveFichaDepilacion(evaluacionId, tipoId, data) {
        // Estructura según la nueva definición en migración
        const fichaData = {
            evaluacion_id: evaluacionId,
            tipo_id: tipoId,
            datos: {
                antecedentes_personales: {
                    nombre_completo: data.nombreCompleto || '',
                    fecha_nacimiento: data.fechaNacimiento || '',
                    edad: data.edad || 0,
                    ocupacion: data.ocupacion || '',
                    telefono_fijo: data.telefonoFijo || '',
                    celular: data.celular || '',
                    email: data.email || '',
                    medio_conocimiento: data.medioConocimiento || ''
                },
                evaluacion_medica: {
                    medicamentos: data.medicamentos || false,
                    isotretinoina: data.isotretinoina || false,
                    alergias: data.alergias || false,
                    enfermedades_piel: data.enfermedadesPiel || false,
                    antecedentes_cancer: data.antecedentesCancer || false,
                    embarazo: data.embarazo || false,
                    lactancia: data.lactancia || false,
                    tatuajes: data.tatuajes || false,
                    antecedentes_herpes: data.antecedentesHerpes || false,
                    patologias_hormonales: data.patologiasHormonales || false,
                    exposicion_sol: data.exposicionSol || '',
                    tipo_piel_fitzpatrick: data.tipoPielFitzpatrick || '',
                    metodo_depilacion_actual: data.metodoDepilacionActual || '',
                    ultima_depilacion: data.ultimaDepilacion || '',
                    otros: data.otros || ''
                },
                zonas_tratamiento: {
                    zonas_seleccionadas: data.zonasSeleccionadas || [],
                    observaciones_medicas: data.observacionesMedicas || ''
                }
            },
            observaciones: data.observaciones || ''
        };
        
        try {
            const response = await fichasEspecificasAPI.create(fichaData);
            
            if (response.success) {
                                mostrarNotificacion('Ficha de depilación guardada correctamente.', 'success');
                return response.data;
            } else {
                // Mostrar el error de la db si viene
                const dbError = response?.error || 'Error guardando ficha de depilación';
                console.error('❌ Error guardando ficha de depilación:', dbError);
                mostrarNotificacion('Error guardando ficha de depilación: ' + dbError, 'error');
                throw new Error(dbError);
            }
        } catch (error) {
            const errorMessage = error?.message || 'Error desconocido guardando ficha de depilación';
            console.error('❌ Error guardando ficha de depilación:', errorMessage);
            mostrarNotificacion('Error guardando ficha de depilación: ' + errorMessage, 'error');
            throw new Error(errorMessage);
        }
    }
    
    async saveFichaCorporal(evaluacionId, tipoId, data) {
        // Estructura según la nueva definición en migración
        const fichaData = {
            evaluacion_id: evaluacionId,
            tipo_id: tipoId,
            datos: {
                antecedentes_personales: {
                    nombre_completo: data.nombreCompleto || '',
                    fecha_nacimiento: data.fechaNacimiento || '',
                    edad: data.edad || 0,
                    ocupacion: data.ocupacion || '',
                    telefono_fijo: data.telefonoFijo || '',
                    celular: data.celular || '',
                    email: data.email || '',
                    medio_conocimiento: data.medioConocimiento || ''
                },
                antecedentes_clinicos: {
                    enfermedades_cardiacas: data.enfermedadesCardiacas || false,
                    enfermedades_renales: data.enfermedadesRenales || false,
                    enfermedades_hepaticas: data.enfermedadesHepaticas || false,
                    enfermedades_digestivas: data.enfermedadesDigestivas || false,
                    enfermedades_neuromusculares: data.enfermedadesNeuromusculares || false,
                    trastorno_coagulacion: data.trastornoCoagulacion || false,
                    alergias: data.alergias || false,
                    epilepsia: data.epilepsia || false,
                    embarazo: data.embarazo || false,
                    dispositivo_intrauterino: data.dispositivoIntrauterino || false,
                    cancer: data.cancer || false,
                    protesis_metalicas: data.protesisMetalicas || false,
                    implantes_colageno: data.implantesColageno || false,
                    medicamentos_actuales: data.medicamentosActuales || false,
                    cirugias: data.cirugias || false,
                    fuma: data.fuma || false,
                    ingiere_alcohol: data.ingiereAlcohol || false,
                    horas_sueno: data.horasSueno || 0,
                    periodo_menstrual_regular: data.periodoMenstrualRegular || false,
                    lesiones_timpano: data.lesionesTimpano || false
                },
                medidas_corporales: {
                    imc_antes: data.imcAntes || 0,
                    imc_despues: data.imcDespues || 0,
                    porcentaje_musculo_antes: data.porcentajeMusculoAntes || 0,
                    porcentaje_musculo_despues: data.porcentajeMusculoDespues || 0,
                    porcentaje_grasa_antes: data.porcentajeGrasaAntes || 0,
                    porcentaje_grasa_despues: data.porcentajeGrasaDespues || 0,
                    grasa_visceral_antes: data.grasaVisceralAntes || 0,
                    grasa_visceral_despues: data.grasaVisceralDespues || 0,
                    peso_corporal_antes: data.pesoCorporalAntes || 0,
                    peso_corporal_despues: data.pesoCorporalDespues || 0,
                    edad_corporal_antes: data.edadCorporalAntes || 0,
                    edad_corporal_despues: data.edadCorporalDespues || 0,
                    metabolismo_basal_antes: data.metabolismoBasalAntes || 0,
                    metabolismo_basal_despues: data.metabolismoBasalDespues || 0
                },
                medidas_pliegues: {
                    abdomen_alto_antes: data.abdomenAltoAntes || 0,
                    abdomen_alto_despues: data.abdomenAltoDespues || 0,
                    abdomen_bajo_antes: data.abdomenBajoAntes || 0,
                    abdomen_bajo_despues: data.abdomenBajoDespues || 0,
                    cintura_antes: data.cinturaAntes || 0,
                    cintura_despues: data.cinturaDespues || 0,
                    cadera_antes: data.caderaAntes || 0,
                    cadera_despues: data.caderaDespues || 0,
                    flanco_derecho_antes: data.flancoDerechoAntes || 0,
                    flanco_derecho_despues: data.flancoDerechoDespues || 0,
                    flanco_izquierdo_antes: data.flancoIzquierdoAntes || 0,
                    flanco_izquierdo_despues: data.flancoIzquierdoDespues || 0
                },
                tratamiento: {
                    tratamientos_previos: data.tratamientosPrevios || '',
                    objetivo_estetico: data.objetivoEstetico || ''
                }
            },
            observaciones: data.observaciones || ''
        };
        
        try {
            const response = await fichasEspecificasAPI.create(fichaData);
            
            if (response.success) {
                                mostrarNotificacion('Ficha corporal/facial guardada correctamente.', 'success');
                return response.data;
            } else {
                // Mostrar el error de la db si viene
                const dbError = response?.error || 'Error guardando ficha corporal/facial';
                console.error('❌ Error guardando ficha corporal/facial:', dbError);
                mostrarNotificacion('Error guardando ficha corporal/facial: ' + dbError, 'error');
                throw new Error(dbError);
            }
        } catch (error) {
            const errorMessage = error?.message || 'Error desconocido guardando ficha corporal/facial';
            console.error('❌ Error guardando ficha corporal/facial:', errorMessage);
            mostrarNotificacion('Error guardando ficha corporal/facial: ' + errorMessage, 'error');
            throw new Error(errorMessage);
        }
    }
    
    // Método para obtener zonas de un pack
    getZonasFromPack(packId) {
        // TODO: Obtener desde la base de datos usando packsAPI
        // Por ahora retornamos array vacío - se implementará cuando se conecte con packs
                mostrarNotificacion('Funcionalidad de obtener zonas de un pack aún no implementada.', 'info');
        return [];
    }
    
    // Método para calcular precio adicional por zonas extra
    calculatePrecioZonasExtra(zonasPack, zonasSeleccionadas) {
        const zonasExtra = zonasSeleccionadas.filter(zona => !zonasPack.includes(zona));
        const total = zonasExtra.reduce((total, zona) => {
            const zonaData = this.zonas.find(z => z.codigo === zona);
            return total + (zonaData ? zonaData.precio_base : 0);
        }, 0);
        if (zonasExtra.length > 0) {
                    }
        return total;
    }
    
    // Método para calcular descuento por zonas removidas
    calculateDescuentoZonasRemovidas(zonasPack, zonasSeleccionadas) {
        const zonasRemovidas = zonasPack.filter(zona => !zonasSeleccionadas.includes(zona));
        const total = zonasRemovidas.reduce((total, zona) => {
            const zonaData = this.zonas.find(z => z.codigo === zona);
            return total + (zonaData ? zonaData.precio_base : 0);
        }, 0);
        if (zonasRemovidas.length > 0) {
                    }
        return total;
    }
}

// Exportar instancia global
export const fichasEspecificas = new FichasEspecificasModule();
