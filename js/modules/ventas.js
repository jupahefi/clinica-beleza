/**
 * Módulo de Gestión de Ventas
 * Maneja ventas con el nuevo proceso: Evaluación -> Ficha Específica -> Venta
 */

import { fichasAPI, evaluacionesAPI, fichasEspecificasAPI, ventasAPI, tratamientosAPI, packsAPI } from '../api-client.js';
import { mostrarNotificacion, getCurrentProfesionalId } from '../utils.js';

class VentasModule {
    constructor() {
        this.ventas = [];
        this.tratamientos = [];
        this.packs = [];
        this.ofertas = [];
        this.clienteSeleccionado = null;
        this.historial = [];
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.configurarEventos();
        this.configurarSelect2();
        this.cargarTratamientosEnSelect();
    }

    async cargarDatos() {
        try {
            this.tratamientos = await tratamientosAPI.getAll();
            for (const tratamiento of this.tratamientos) {
                tratamiento.packs = await packsAPI.getByTratamientoId(tratamiento.id);
            }
            this.ofertas = await fetch('/api.php/ofertas-aplicables').then(r => r.json()).then(d => d.data || []);
            console.log(`[VENTAS] Datos cargados: ${this.tratamientos.length} tratamientos, ${this.ofertas.length} ofertas.`);
            mostrarNotificacion(`Datos de ventas cargados correctamente (${this.tratamientos.length} tratamientos, ${this.ofertas.length} ofertas)`, 'success');
        } catch (error) {
            console.error('[VENTAS] Error cargando datos:', error);
            // Si viene error de la db, mostrar el mensaje tal cual
            const errorMessage = error?.message || error?.error || 'Error desconocido cargando datos de ventas';
            mostrarNotificacion(`[VENTAS] Error cargando datos: ${errorMessage}`, 'error');
        }
    }

    configurarSelect2() {
        $('#cliente').select2({
            ajax: {
                url: '/api.php/fichas',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        search: params.term,
                        page: params.page || 1
                    };
                },
                processResults: function (data) {
                    return {
                        results: data.data.map(paciente => ({
                            id: paciente.id,
                            text: `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut}`
                        })),
                        pagination: { more: false }
                    };
                },
                cache: true
            },
            placeholder: '-- Selecciona cliente --',
            minimumInputLength: 2,
            language: {
                inputTooShort: function() {
                    return "Por favor ingresa al menos 2 caracteres";
                },
                noResults: function() {
                    return "No se encontraron pacientes";
                },
                searching: function() {
                    return "Buscando...";
                }
            }
        });

        $('#cliente').on('select2:select', (e) => {
            this.clienteSeleccionado = e.params.data;
            console.log(`[VENTAS] Cliente seleccionado: ${this.clienteSeleccionado.text}`);
            mostrarNotificacion(`Cliente seleccionado: ${this.clienteSeleccionado.text}`, 'info');
            this.cargarHistorialCliente();
        });
    }

    configurarEventos() {
        const selectTratamiento = document.getElementById('tratamiento');
        if (selectTratamiento) {
            selectTratamiento.addEventListener('change', () => {
                console.log('[VENTAS] Cambio de tratamiento seleccionado');
                this.mostrarOpciones();
                this.calcularPrecio();
            });
        }

        const selectPack = document.getElementById('pack');
        if (selectPack) {
            selectPack.addEventListener('change', () => {
                console.log('[VENTAS] Cambio de pack seleccionado');
                this.calcularPrecio();
            });
        }

        const inputSesiones = document.getElementById('cantidadSesiones');
        if (inputSesiones) {
            inputSesiones.addEventListener('input', () => {
                console.log('[VENTAS] Cambio en cantidad de sesiones');
                this.calcularPrecio();
            });
        }

        const inputOferta = document.getElementById('ofertaVenta');
        if (inputOferta) {
            inputOferta.addEventListener('input', () => {
                console.log('[VENTAS] Cambio en oferta/porcentaje descuento');
                this.calcularPrecio();
            });
        }

        const btnConfirmar = document.querySelector('button[onclick="confirmarVenta()"]');
        if (btnConfirmar) {
            btnConfirmar.onclick = () => this.confirmarVenta();
        }
    }

    cargarTratamientosEnSelect() {
        const selectTratamiento = document.getElementById('tratamiento');
        if (!selectTratamiento) return;
        selectTratamiento.innerHTML = '<option value="">-- Selecciona tratamiento --</option>';
        this.tratamientos.forEach(tratamiento => {
            const option = document.createElement('option');
            option.value = tratamiento.id;
            option.textContent = tratamiento.nombre;
            selectTratamiento.appendChild(option);
        });
        console.log('[VENTAS] Tratamientos cargados en selector');
    }

    mostrarOpciones() {
        const selectTratamiento = document.getElementById('tratamiento');
        const packsDiv = document.getElementById('packsDiv');
        const sesionesDiv = document.getElementById('sesionesDiv');
        const packSelect = document.getElementById('pack');

        if (!selectTratamiento || !packsDiv || !sesionesDiv || !packSelect) return;

        const tratamientoId = parseInt(selectTratamiento.value);
        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);

        packSelect.innerHTML = '<option value="">-- Selecciona pack --</option>';

        if (tratamiento && tratamiento.packs && tratamiento.packs.length > 0) {
            packsDiv.style.display = "block";
            this.mostrarSugerenciasOfertas(tratamiento);
            tratamiento.packs.forEach((pack, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                let precioTexto = `$${pack.precio_regular.toLocaleString()}`;
                if (pack.precio_oferta && pack.precio_oferta < pack.precio_regular) {
                    const descuento = Math.round(((pack.precio_regular - pack.precio_oferta) / pack.precio_regular) * 100);
                    precioTexto = `$${pack.precio_oferta.toLocaleString()} (${descuento}% OFF)`;
                }
                const sesionesInfo = pack.sesiones_incluidas ? ` - ${pack.sesiones_incluidas} sesiones` : '';
                option.textContent = `${pack.nombre}${sesionesInfo} - ${precioTexto}`;
                packSelect.appendChild(option);
            });
            console.log(`[VENTAS] Packs cargados para tratamiento: ${tratamiento.nombre}`);
        } else {
            packsDiv.style.display = "none";
        }
        sesionesDiv.style.display = "block";
    }
    
    mostrarSugerenciasOfertas(tratamiento) {
        const sugerenciasDiv = document.getElementById('sugerenciasOfertas');
        if (!sugerenciasDiv) return;
        const packsConOfertas = tratamiento.packs.filter(pack => 
            pack.precio_oferta && pack.precio_oferta < pack.precio_regular
        );
        if (packsConOfertas.length === 0) {
            sugerenciasDiv.style.display = 'none';
            return;
        }
        let html = '<div class="sugerencias-ofertas">';
        html += '<h4>💡 Sugerencias de Ofertas Disponibles:</h4>';
        html += '<div class="ofertas-grid">';
        packsConOfertas.forEach(pack => {
            const descuento = Math.round(((pack.precio_regular - pack.precio_oferta) / pack.precio_regular) * 100);
            const ahorro = pack.precio_regular - pack.precio_oferta;
            html += `
                <div class="oferta-card">
                    <h5>${pack.nombre}</h5>
                    <p class="sesiones">${pack.sesiones_incluidas || 'N/A'} sesiones</p>
                    <p class="precio-regular">$${pack.precio_regular.toLocaleString()}</p>
                    <p class="precio-oferta">$${pack.precio_oferta.toLocaleString()}</p>
                    <p class="descuento">${descuento}% OFF</p>
                    <p class="ahorro">Ahorras $${ahorro.toLocaleString()}</p>
                </div>
            `;
        });
        html += '</div></div>';
        sugerenciasDiv.innerHTML = html;
        sugerenciasDiv.style.display = 'block';
        console.log(`[VENTAS] Sugerencias de ofertas mostradas para ${tratamiento.nombre}`);
    }

    calcularPrecio() {
        const selectTratamiento = document.getElementById('tratamiento');
        const inputSesiones = document.getElementById('cantidadSesiones');
        const inputOferta = document.getElementById('ofertaVenta');
        const packSelect = document.getElementById('pack');
        const resultado = document.getElementById('resultado');

        if (!selectTratamiento || !inputSesiones || !inputOferta || !packSelect || !resultado) return;

        const tratamientoId = parseInt(selectTratamiento.value);
        const sesiones = parseInt(inputSesiones.value) || 1;
        const ofertaVenta = parseInt(inputOferta.value) || 0;
        const packIndex = packSelect.value;

        if (!tratamientoId) {
            resultado.textContent = "Selecciona un tratamiento.";
            return;
        }

        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        let precio = 0;
        let detalle = "";

        if (packIndex !== "") {
            const pack = tratamiento.packs[packIndex];
            const precioRegular = pack.precio_regular || 0;
            const precioOferta = pack.precio_oferta || 0;
            precio = precioOferta > 0 ? precioOferta : precioRegular;
            
            detalle = `Pack seleccionado: ${pack.nombre}`;
            if (pack.sesiones_incluidas) {
                detalle += ` (${pack.sesiones_incluidas} sesiones incluidas)`;
            }
            if (precioOferta > 0 && precioOferta < precioRegular) {
                const descuento = Math.round(((precioRegular - precioOferta) / precioRegular) * 100);
                const ahorro = precioRegular - precioOferta;
                detalle += `<br>💰 <strong>OFERTA ACTIVA:</strong> ${descuento}% OFF (Ahorras $${ahorro.toLocaleString()})`;
                detalle += `<br>Precio regular: $${precioRegular.toLocaleString()} → <strong>Precio oferta: $${precioOferta.toLocaleString()}</strong>`;
            } else {
                detalle += `<br>Precio: $${precioRegular.toLocaleString()}`;
            }
        } else {
            const precioBase = (tratamiento.precio_oferta || tratamiento.precio_regular || 0);
            precio = sesiones * precioBase;
            detalle = `Sesión individual x${sesiones}: $${precio.toLocaleString()}`;
            detalle += `<br>Precio por sesión: $${precioBase.toLocaleString()}`;
        }

        if (ofertaVenta > 0) {
            const descuento = (precio * ofertaVenta) / 100;
            precio = precio - descuento;
            detalle += `<br>🎯 Descuento adicional aplicado: -${ofertaVenta}%`;
        }
        
        let sesionesFinales = sesiones;
        if (ofertaVenta > 0) {
            const sesionesAdicionales = Math.floor((ofertaVenta / 10));
            sesionesFinales = sesiones + sesionesAdicionales;
            if (sesionesAdicionales > 0) {
                detalle += `<br>🎁 Sesiones adicionales por oferta: +${sesionesAdicionales} (total: ${sesionesFinales})`;
            }
        }

        // Asegurar que precio sea un número válido
        const precioFinal = (precio || 0);
        
        resultado.innerHTML = `
            <strong>Tratamiento:</strong> ${tratamiento.nombre}<br>
            <strong>Precio final:</strong> $${precioFinal.toLocaleString()}<br>
            <em>${detalle}</em>
        `;

        console.log(`[VENTAS] Precio calculado para ${tratamiento.nombre}: $${precio} (${sesionesFinales} sesiones)`);
        return { tratamiento: tratamiento.nombre, sesiones: sesionesFinales, precio, detalle };
    }

    async confirmarVenta() {
        const cliente = document.getElementById('cliente').value;
        if (!cliente) {
            mostrarNotificacion('[VENTAS] Selecciona un cliente primero.', 'warning');
            return;
        }

        const venta = this.calcularPrecio();
        if (!venta) {
            mostrarNotificacion('[VENTAS] Selecciona un tratamiento válido.', 'warning');
            return;
        }
        
        try {
            const tratamientoId = parseInt(document.getElementById('tratamiento').value);
            const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);

            if (tratamiento && tratamiento.nombre.toUpperCase().includes('EVALUACION')) {
                const ventaEvaluacion = await ventasAPI.create({
                    ficha_id: cliente,
                    evaluacion_id: null,
                    ficha_especifica_id: null,
                    tratamiento_id: tratamientoId,
                    pack_id: document.getElementById('pack').value || null,
                    cantidad_sesiones: venta.sesiones,
                    precio_lista: venta.precio,
                    total_pagado: venta.precio
                });

                this.historial.push({
                    ...venta,
                    cliente: this.clienteSeleccionado.text,
                    fecha: new Date().toLocaleDateString(),
                    tipo: 'evaluacion'
                });

                this.renderHistorial();
                this.limpiarFormulario();
                console.log(`[VENTAS] Venta de evaluación registrada para cliente ${this.clienteSeleccionado.text}`);
                mostrarNotificacion('Venta de evaluación registrada exitosamente. Agenda la sesión para completar el proceso.', 'success');
            } else {
                const evaluacion = await evaluacionesAPI.create({
                    ficha_id: cliente,
                    profesional_id: getCurrentProfesionalId(),
                    tratamiento_id: tratamientoId,
                    pack_id: document.getElementById('pack').value || null,
                    precio_sugerido: venta.precio,
                    sesiones_sugeridas: venta.sesiones,
                    recomendaciones: `Venta de ${venta.tratamiento}`
                });

                const fichaEspecifica = await fichasEspecificasAPI.create({
                    evaluacion_id: evaluacion.id,
                    tipo_id: this.obtenerTipoFichaId(venta.tratamiento),
                    datos: {
                        antecedentes_personales: {
                            nombre_completo: this.clienteSeleccionado.text || '',
                            fecha_nacimiento: '',
                            edad: 0,
                            ocupacion: '',
                            telefono_fijo: '',
                            celular: '',
                            email: '',
                            medio_conocimiento: ''
                        },
                        evaluacion_medica: {
                            medicamentos: false,
                            isotretinoina: false,
                            alergias: false,
                            enfermedades_piel: false,
                            antecedentes_cancer: false,
                            embarazo: false,
                            lactancia: false,
                            tatuajes: false,
                            antecedentes_herpes: false,
                            patologias_hormonales: false,
                            exposicion_sol: '',
                            tipo_piel_fitzpatrick: '',
                            metodo_depilacion_actual: '',
                            ultima_depilacion: '',
                            otros: ''
                        },
                        antecedentes_clinicos: {
                            enfermedades_cardiacas: false,
                            enfermedades_renales: false,
                            enfermedades_hepaticas: false,
                            enfermedades_digestivas: false,
                            enfermedades_neuromusculares: false,
                            trastorno_coagulacion: false,
                            alergias: false,
                            epilepsia: false,
                            embarazo: false,
                            dispositivo_intrauterino: false,
                            cancer: false,
                            protesis_metalicas: false,
                            implantes_colageno: false,
                            medicamentos_actuales: false,
                            cirugias: false,
                            fuma: false,
                            ingiere_alcohol: false,
                            horas_sueno: 0,
                            periodo_menstrual_regular: false,
                            lesiones_timpano: false
                        },
                        zonas_tratamiento: {
                            zonas_seleccionadas: [],
                            observaciones_medicas: venta.detalle || ''
                        },
                        tratamiento: {
                            tratamientos_previos: '',
                            objetivo_estetico: `Tratamiento de ${venta.tratamiento}`
                        }
                    },
                    observaciones: venta.detalle || ''
                });

                const ventaCreada = await ventasAPI.create({
                    evaluacion_id: evaluacion.id,
                    ficha_especifica_id: fichaEspecifica.id,
                    tratamiento_id: tratamientoId,
                    cantidad_sesiones: venta.sesiones,
                    precio_lista: venta.precio,
                    total_pagado: venta.precio
                });

                this.historial.push({
                    ...venta,
                    cliente: this.clienteSeleccionado.text,
                    fecha: new Date().toLocaleDateString(),
                    tipo: 'normal'
                });

                this.renderHistorial();
                this.limpiarFormulario();
                console.log(`[VENTAS] Venta registrada para cliente ${this.clienteSeleccionado.text} (${venta.tratamiento})`);
                mostrarNotificacion('Venta registrada exitosamente.', 'success');
            }
        } catch (error) {
            console.error('[VENTAS] Error confirmando venta:', error);
            // Mostrar el error de la db si existe, si no, mensaje genérico
            const errorMessage = error?.message || error?.error || 'Error desconocido al registrar la venta';
            mostrarNotificacion(`[VENTAS] Error al registrar la venta: ${errorMessage}`, 'error');
        }
    }

    obtenerTipoFichaId(nombreTratamiento) {
        const mapeo = {
            'DEPILACION': 1,
            'CORPORAL_FACIAL': 2,
            'FACIAL': 3,
            'CAPILAR': 4
        };
        const nombreUpper = nombreTratamiento.toUpperCase();
        if (nombreUpper.includes('DEPILACION') || nombreUpper.includes('LASER')) {
            return 1;
        } else if (nombreUpper.includes('CORPORAL') || nombreUpper.includes('FACIAL') || nombreUpper.includes('LIPO')) {
            return 2;
        } else if (nombreUpper.includes('FACIAL')) {
            return 3;
        } else if (nombreUpper.includes('CAPILAR') || nombreUpper.includes('CABELLO')) {
            return 4;
        }
        return 1;
    }

    async cargarHistorialCliente() {
        if (!this.clienteSeleccionado) return;
        try {
            const ventasCliente = await ventasAPI.getByFichaId(this.clienteSeleccionado.id);
            this.historial = ventasCliente.map(venta => ({
                tratamiento: venta.tratamiento_nombre,
                precio: venta.total_pagado,
                fecha: new Date(venta.fecha_creacion).toLocaleDateString(),
                detalle: `Sesiones: ${venta.cantidad_sesiones}`
            }));
            this.renderHistorial();
            console.log(`[VENTAS] Historial de ventas cargado para cliente ${this.clienteSeleccionado.text} (${this.historial.length} ventas)`);
            mostrarNotificacion(`Historial de ventas cargado para ${this.clienteSeleccionado.text}`, 'success');
        } catch (error) {
            console.error('[VENTAS] Error cargando historial del cliente:', error);
            const errorMessage = error?.message || error?.error || 'Error desconocido cargando historial';
            mostrarNotificacion(`[VENTAS] Error cargando historial del cliente: ${errorMessage}`, 'error');
            this.historial = [];
            this.renderHistorial();
        }
    }

    renderHistorial() {
        const lista = document.getElementById('historialLista');
        if (!lista) return;

        if (this.historial.length === 0) {
            lista.textContent = "Sin compras registradas.";
            return;
        }

        lista.innerHTML = "";
        this.historial.forEach((venta, i) => {
            const div = document.createElement('div');
            div.className = 'venta-item';
            div.innerHTML = `
                <strong>#${i + 1}</strong> - ${venta.tratamiento}  
                → $${venta.precio?.toLocaleString() || 'N/A'}<br>
                <small>${venta.detalle || ''} - ${venta.fecha || ''}</small>
            `;
            lista.appendChild(div);
        });
    }

    limpiarFormulario() {
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect && typeof $ !== 'undefined' && $.fn.select2) {
            $(clienteSelect).val(null).trigger('change');
        }
        const selectTratamiento = document.getElementById('tratamiento');
        const packSelect = document.getElementById('pack');
        const inputSesiones = document.getElementById('cantidadSesiones');
        const inputOferta = document.getElementById('ofertaVenta');
        const resultado = document.getElementById('resultado');

        if (selectTratamiento) selectTratamiento.value = '';
        if (packSelect) packSelect.value = '';
        if (inputSesiones) inputSesiones.value = '1';
        if (inputOferta) inputOferta.value = '0';
        if (resultado) resultado.textContent = 'Selecciona tratamiento y modalidad para calcular el precio.';

        const packsDiv = document.getElementById('packsDiv');
        if (packsDiv) packsDiv.style.display = 'none';

        this.clienteSeleccionado = null;
        console.log('[VENTAS] Formulario de venta limpiado');
        mostrarNotificacion('Formulario de venta limpiado', 'info');
    }

    getVentas() {
        return this.ventas;
    }

    async loadVentas() {
        try {
            this.ventas = await ventasAPI.getAll();
            console.log(`[VENTAS] Ventas cargadas: ${this.ventas.length}`);
            mostrarNotificacion(`Ventas cargadas correctamente (${this.ventas.length})`, 'success');
        } catch (error) {
            console.error('[VENTAS] Error cargando ventas:', error);
            const errorMessage = error?.message || error?.error || 'Error desconocido cargando ventas';
            mostrarNotificacion(`[VENTAS] Error cargando ventas: ${errorMessage}`, 'error');
        }
    }

    async loadPacientes() {
        try {
            console.log('[VENTAS] Select2 configurado para cargar pacientes automáticamente');
            mostrarNotificacion('Selector de pacientes listo para búsqueda.', 'info');
        } catch (error) {
            console.error('[VENTAS] Error configurando Select2:', error);
            const errorMessage = error?.message || error?.error || 'Error desconocido configurando Select2';
            mostrarNotificacion(`[VENTAS] Error configurando selector de pacientes: ${errorMessage}`, 'error');
        }
    }

    buscarVentas(termino) {
        if (!termino) {
            this.renderHistorial();
            return;
        }
        const ventasFiltradas = this.historial.filter(venta => 
            venta.tratamiento?.toLowerCase().includes(termino.toLowerCase()) ||
            venta.cliente?.toLowerCase().includes(termino.toLowerCase())
        );
        console.log(`[VENTAS] Búsqueda de ventas: "${termino}" (${ventasFiltradas.length} resultados)`);
        this.renderVentasFiltradas(ventasFiltradas);
        mostrarNotificacion(`Búsqueda de ventas: "${termino}" (${ventasFiltradas.length} resultados)`, 'info');
    }

    renderVentasFiltradas(ventas) {
        const lista = document.getElementById('historialLista');
        if (!lista) return;

        if (ventas.length === 0) {
            lista.textContent = 'No se encontraron ventas.';
            return;
        }

        lista.innerHTML = '';
        ventas.forEach((venta, i) => {
            const div = document.createElement('div');
            div.className = 'venta-item';
            div.innerHTML = `
                <strong>#${i + 1}</strong> - ${venta.tratamiento}  
                → $${venta.precio?.toLocaleString() || 'N/A'}<br>
                <small>${venta.detalle || ''}</small>
            `;
            lista.appendChild(div);
        });
    }
}

export const ventasModule = new VentasModule();
