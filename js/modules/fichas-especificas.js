/**
 * Módulo de Fichas Específicas
 * Maneja fichas de depilación y corporal/facial
 */

import { ZONAS_CUERPO, ZONAS_CUERPO_LABELS, PRECIO_POR_ZONA } from '../constants.js';
import { formatCurrency, formatDate } from '../utils.js';
import { ConsentimientoModal } from '../components/SignaturePad.js';
import { fichasEspecificasAPI } from '../api-client.js';

export class FichasEspecificasModule {
    constructor() {
        this.consentimientoModal = new ConsentimientoModal();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadConsentimientoText();
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
        
        const zonasGrid = document.createElement('div');
        zonasGrid.className = 'zonas-grid';
        zonasGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        `;
        
        Object.entries(ZONAS_CUERPO_LABELS).forEach(([key, label]) => {
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
            checkbox.id = `zona_${key}`;
            checkbox.dataset.zona = key;
            checkbox.dataset.precio = PRECIO_POR_ZONA[key];
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `zona_${key}`;
            labelElement.textContent = label;
            labelElement.style.cursor = 'pointer';
            
            const precioSpan = document.createElement('span');
            precioSpan.textContent = formatCurrency(PRECIO_POR_ZONA[key]);
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
        const zonasSeleccionadas = Array.from(checkboxes).map(cb => ({
            zona: cb.dataset.zona,
            label: ZONAS_CUERPO_LABELS[cb.dataset.zona],
            precio: parseInt(cb.dataset.precio)
        }));
        
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
            console.warn(`Error cargando consentimiento: ${errorMessage}`);
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
                console.log('Consentimiento aceptado con firma BLOB:', signatureBlob);
                if (onAccept) await onAccept(signatureBlob);
            },
            () => {
                console.log('Consentimiento rechazado');
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
            formData.append('profesional_id', 1); // TODO: Obtener del contexto de sesión
            
            const response = await fichasEspecificasAPI.saveConsentimientoFirma(formData);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error('Error guardando firma digital');
            }
        } catch (error) {
            console.error('Error guardando firma digital:', error);
            const errorMessage = error.message || 'Error desconocido guardando firma digital';
            throw new Error(`Error guardando firma digital: ${errorMessage}`);
        }
    }
    
    async verificarConsentimientoFirmado(fichaId, tipoConsentimiento = 'depilacion') {
        try {
            const response = await fichasEspecificasAPI.getConsentimientoFirma(fichaId, tipoConsentimiento);
            
            if (response.success) {
                return response.data;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error verificando consentimiento:', error);
            const errorMessage = error.message || 'Error desconocido verificando consentimiento';
            console.error(`Error verificando consentimiento: ${errorMessage}`);
            return null;
        }
    }
    
    async saveFichaDepilacion(pacienteId, data) {
        const fichaData = {
            tipo: 'depilacion',
            paciente_id: pacienteId,
            zonas_tratadas: data.zonas || [],
            observaciones_medicas: data.observacionesMedicas || '',
            consentimiento_firmado: data.consentimiento || null,
            fecha_creacion: new Date().toISOString(),
            antecedentes: {
                medicamentos: data.medicamentos || false,
                isotretinoina: data.isotretinoina || false,
                alergias: data.alergias || false,
                enfermedades_piel: data.enfermedadesPiel || false,
                antecedentes_cancer: data.antecedentesCancer || false,
                enfermedades_importantes: data.enfermedadesImportantes || false,
                epilepsia: data.epilepsia || false,
                hiper_hipopigmentacion: data.hiperHipopigmentacion || false,
                embarazo: data.embarazo || false,
                post_parto: data.postParto || false,
                lactancia: data.lactancia || false,
                cicatriz_activa: data.cicatrizActiva || false,
                tatuajes: data.tatuajes || false,
                antecedentes_herpes: data.antecedentesHerpes || false,
                patologias_hormonales: data.patologiasHormonales || false,
                tratamientos_laser_anteriores: data.tratamientosLaserAnteriores || false,
                antecedentes_cancer: data.antecedentesCancer || false,
                metodo_depilacion_actual: data.metodoDepilacionActual || '',
                ultima_depilacion: data.ultimaDepilacion || '',
                exposicion_sol: data.exposicionSol || '',
                tipo_piel_fitzpatrick: data.tipoPielFitzpatrick || '',
                otros: data.otros || ''
            }
        };
        
        try {
            const response = await fichasEspecificasAPI.saveFichaEspecifica(fichaData);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error('Error guardando ficha de depilación');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = error.message || 'Error desconocido guardando ficha de depilación';
            throw new Error(`Error guardando ficha de depilación: ${errorMessage}`);
        }
    }
    
    async saveFichaCorporal(pacienteId, data) {
        const fichaData = {
            tipo: 'corporal_facial',
            paciente_id: pacienteId,
            tratamientos_previos: data.tratamientosPrevios || '',
            objetivo_estetico: data.objetivoEstetico || '',
            fecha_creacion: new Date().toISOString(),
            antecedentes: {
                medicamentos: data.medicamentos || false,
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
                otros: data.otros || ''
            }
        };
        
        try {
            const response = await fichasEspecificasAPI.saveFichaEspecifica(fichaData);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error('Error guardando ficha corporal/facial');
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
    
    // Método para obtener zonas de un pack
    getZonasFromPack(packId) {
        // Aquí deberías obtener las zonas desde la base de datos
        // Por ahora, retornamos las zonas basadas en el ID del pack
        const packZonas = {
            'cuerpo_completo': Object.values(ZONAS_CUERPO),
            'cuerpo_sin_rostro': Object.values(ZONAS_CUERPO).filter(z => 
                ![ZONAS_CUERPO.ROSTRO_C, ZONAS_CUERPO.BOZO, ZONAS_CUERPO.MENTON, ZONAS_CUERPO.PATILLAS, ZONAS_CUERPO.CUELLO].includes(z)
            ),
            'rostro_completo': [ZONAS_CUERPO.ROSTRO_C, ZONAS_CUERPO.BOZO, ZONAS_CUERPO.MENTON, ZONAS_CUERPO.PATILLAS, ZONAS_CUERPO.CUELLO],
            'full_body': [ZONAS_CUERPO.PIERNAS, ZONAS_CUERPO.BRAZOS, ZONAS_CUERPO.AXILA, ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO],
            'semi_full': [ZONAS_CUERPO.PIERNAS, ZONAS_CUERPO.AXILA, ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO],
            'bikini_full': [ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO],
            'bikini_axilas': [ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO, ZONAS_CUERPO.AXILA]
        };
        
        return packZonas[packId] || [];
    }
    
    // Método para calcular precio adicional por zonas extra
    calculatePrecioZonasExtra(zonasPack, zonasSeleccionadas) {
        const zonasExtra = zonasSeleccionadas.filter(zona => !zonasPack.includes(zona));
        return zonasExtra.reduce((total, zona) => total + (PRECIO_POR_ZONA[zona] || 0), 0);
    }
    
    // Método para calcular descuento por zonas removidas
    calculateDescuentoZonasRemovidas(zonasPack, zonasSeleccionadas) {
        const zonasRemovidas = zonasPack.filter(zona => !zonasSeleccionadas.includes(zona));
        return zonasRemovidas.reduce((total, zona) => total + (PRECIO_POR_ZONA[zona] || 0), 0);
    }
}

// Exportar instancia global
export const fichasEspecificas = new FichasEspecificasModule();
