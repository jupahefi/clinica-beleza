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
            // Cargar tratamientos disponibles usando API client
            this.tratamientos = await tratamientosAPI.getAll();

            // Cargar packs por tratamiento
            for (const tratamiento of this.tratamientos) {
                tratamiento.packs = await packsAPI.getByTratamientoId(tratamiento.id);
            }

            // Cargar ofertas aplicables
            this.ofertas = await fetch('/api.php/ofertas/aplicables').then(r => r.json()).then(d => d.data || []);

            console.log('Datos de ventas cargados:', {
                tratamientos: this.tratamientos.length,
                ofertas: this.ofertas.length
            });

        } catch (error) {
            console.error('Error cargando datos de ventas:', error);
            const errorMessage = error.message || 'Error desconocido cargando datos de ventas';
            mostrarNotificacion(`Error cargando datos de ventas: ${errorMessage}`, 'error');
        }
    }

    configurarSelect2() {
        // Configurar Select2 para el selector de cliente con AJAX
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
                        pagination: {
                            more: false // Por ahora sin paginación
                        }
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

        // Evento cuando se selecciona un cliente
        $('#cliente').on('select2:select', (e) => {
            this.clienteSeleccionado = e.params.data;
            this.cargarHistorialCliente();
        });
    }

    configurarEventos() {
        // Configurar select de tratamiento
        const selectTratamiento = document.getElementById('tratamiento');
        if (selectTratamiento) {
            selectTratamiento.addEventListener('change', () => {
                this.mostrarOpciones();
                this.calcularPrecio();
            });
        }

        // Configurar select de pack
        const selectPack = document.getElementById('pack');
        if (selectPack) {
            selectPack.addEventListener('change', () => {
                this.calcularPrecio();
            });
        }

        // Configurar inputs numéricos
        const inputSesiones = document.getElementById('cantidadSesiones');
        if (inputSesiones) {
            inputSesiones.addEventListener('input', () => {
                this.calcularPrecio();
            });
        }

        const inputOferta = document.getElementById('ofertaVenta');
        if (inputOferta) {
            inputOferta.addEventListener('input', () => {
                this.calcularPrecio();
            });
        }

        // Configurar botón de confirmar venta
        const btnConfirmar = document.querySelector('button[onclick="confirmarVenta()"]');
        if (btnConfirmar) {
            btnConfirmar.onclick = () => this.confirmarVenta();
        }
    }

    cargarTratamientosEnSelect() {
        const selectTratamiento = document.getElementById('tratamiento');
        if (!selectTratamiento) return;

        // Limpiar opciones existentes
        selectTratamiento.innerHTML = '<option value="">-- Selecciona tratamiento --</option>';

        // Agregar tratamientos
        this.tratamientos.forEach(tratamiento => {
            const option = document.createElement('option');
            option.value = tratamiento.id;
            option.textContent = tratamiento.nombre;
            selectTratamiento.appendChild(option);
        });
    }

    mostrarOpciones() {
        const selectTratamiento = document.getElementById('tratamiento');
        const packsDiv = document.getElementById('packsDiv');
        const sesionesDiv = document.getElementById('sesionesDiv');
        const packSelect = document.getElementById('pack');

        if (!selectTratamiento || !packsDiv || !sesionesDiv || !packSelect) return;

        const tratamientoId = parseInt(selectTratamiento.value);
        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);

        // Limpiar packs
        packSelect.innerHTML = '<option value="">-- Selecciona pack --</option>';

        if (tratamiento && tratamiento.packs && tratamiento.packs.length > 0) {
            packsDiv.style.display = "block";
            
            // Mostrar sugerencias de ofertas
            this.mostrarSugerenciasOfertas(tratamiento);
            
            tratamiento.packs.forEach((pack, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                
                // Calcular descuento si hay oferta
                let precioTexto = `$${pack.precio_regular.toLocaleString()}`;
                if (pack.precio_oferta && pack.precio_oferta < pack.precio_regular) {
                    const descuento = Math.round(((pack.precio_regular - pack.precio_oferta) / pack.precio_regular) * 100);
                    precioTexto = `$${pack.precio_oferta.toLocaleString()} (${descuento}% OFF)`;
                }
                
                // Mostrar sesiones incluidas si están definidas
                const sesionesInfo = pack.sesiones_incluidas ? ` - ${pack.sesiones_incluidas} sesiones` : '';
                option.textContent = `${pack.nombre}${sesionesInfo} - ${precioTexto}`;
                packSelect.appendChild(option);
            });
        } else {
            packsDiv.style.display = "none";
        }

        sesionesDiv.style.display = "block"; // siempre hay sesiones individuales
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

        // Si se seleccionó un pack
        if (packIndex !== "") {
            const pack = tratamiento.packs[packIndex];
            precio = pack.precio_oferta || pack.precio_regular;
            
            // Mostrar información detallada del pack
            detalle = `Pack seleccionado: ${pack.nombre}`;
            if (pack.sesiones_incluidas) {
                detalle += ` (${pack.sesiones_incluidas} sesiones incluidas)`;
            }
            
            // Mostrar descuento si aplica
            if (pack.precio_oferta && pack.precio_oferta < pack.precio_regular) {
                const descuento = Math.round(((pack.precio_regular - pack.precio_oferta) / pack.precio_regular) * 100);
                const ahorro = pack.precio_regular - pack.precio_oferta;
                detalle += `<br>💰 <strong>OFERTA ACTIVA:</strong> ${descuento}% OFF (Ahorras $${ahorro.toLocaleString()})`;
                detalle += `<br>Precio regular: $${pack.precio_regular.toLocaleString()} → <strong>Precio oferta: $${pack.precio_oferta.toLocaleString()}</strong>`;
            } else {
                detalle += `<br>Precio: $${pack.precio_regular.toLocaleString()}`;
            }
        } else {
            // modalidad sesión individual
            precio = sesiones * (tratamiento.precio_oferta || tratamiento.precio_regular);
            detalle = `Sesión individual x${sesiones}: $${precio.toLocaleString()}`;
            
            // Mostrar precio por sesión
            const precioPorSesion = tratamiento.precio_oferta || tratamiento.precio_regular;
            detalle += `<br>Precio por sesión: $${precioPorSesion.toLocaleString()}`;
        }

        // Oferta adicional a la venta (descuento manual)
        if (ofertaVenta > 0) {
            const descuento = (precio * ofertaVenta) / 100;
            precio = precio - descuento;
            detalle += `<br>🎯 Descuento adicional aplicado: -${ofertaVenta}%`;
        }
        
        // Calcular sesiones finales considerando ofertas
        let sesionesFinales = sesiones;
        if (ofertaVenta > 0) {
            // Si hay oferta, calcular sesiones adicionales basadas en el descuento
            const sesionesAdicionales = Math.floor((ofertaVenta / 10)); // Cada 10% = 1 sesión adicional
            sesionesFinales = sesiones + sesionesAdicionales;
            if (sesionesAdicionales > 0) {
                detalle += `<br>🎁 Sesiones adicionales por oferta: +${sesionesAdicionales} (total: ${sesionesFinales})`;
            }
        }

        resultado.innerHTML = `
            <strong>Tratamiento:</strong> ${tratamiento.nombre}<br>
            <strong>Precio final:</strong> $${precio.toLocaleString()}<br>
            <em>${detalle}</em>
        `;

        return { tratamiento: tratamiento.nombre, sesiones: sesionesFinales, precio, detalle };
    }

    async confirmarVenta() {
        const cliente = document.getElementById('cliente').value;
        if (!cliente) {
            mostrarNotificacion('Selecciona un cliente primero.', 'warning');
            return;
        }

        const venta = this.calcularPrecio();
        if (!venta) {
            mostrarNotificacion('Selecciona un tratamiento válido.', 'warning');
            return;
        }
        
        try {
            const tratamientoId = parseInt(document.getElementById('tratamiento').value);
            const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
            
            // Verificar si es una venta de evaluación
            if (tratamiento && tratamiento.nombre.toUpperCase().includes('EVALUACION')) {
                // FLUJO DE EVALUACIÓN: Venta directa sin evaluación previa
                const ventaEvaluacion = await ventasAPI.create({
                    ficha_id: cliente,
                    evaluacion_id: null, // No requiere evaluación previa
                    ficha_especifica_id: null, // No requiere ficha específica
                    tratamiento_id: tratamientoId,
                    pack_id: document.getElementById('pack').value || null,
                    cantidad_sesiones: venta.sesiones, // Usa sesiones finales calculadas
                    precio_lista: venta.precio,
                    total_pagado: venta.precio
                });

                // Agregar al historial local
                this.historial.push({
                    ...venta,
                    cliente: this.clienteSeleccionado.text,
                    fecha: new Date().toLocaleDateString(),
                    tipo: 'evaluacion'
                });

                this.renderHistorial();
                this.limpiarFormulario();
                mostrarNotificacion('Venta de evaluación registrada exitosamente. Agenda la sesión para completar el proceso.', 'success');
                
            } else {
                // FLUJO NORMAL: Evaluación -> Ficha Específica -> Venta
                const evaluacion = await evaluacionesAPI.create({
                    ficha_id: cliente,
                    profesional_id: getCurrentProfesionalId(),
                    tratamiento_id: tratamientoId,
                    pack_id: document.getElementById('pack').value || null,
                    precio_sugerido: venta.precio,
                    sesiones_sugeridas: venta.sesiones, // Usa sesiones finales calculadas
                    recomendaciones: `Venta de ${venta.tratamiento}`
                });

                const fichaEspecifica = await fichasEspecificasAPI.create({
                    evaluacion_id: evaluacion.id,
                    tipo_id: this.obtenerTipoFichaId(venta.tratamiento),
                    datos: {
                        // Estructura básica según el tipo de ficha
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
                        // Para depilación
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
                        // Para corporal/facial
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
                        // Campos específicos según tratamiento
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
                    cantidad_sesiones: venta.sesiones, // Usa sesiones finales calculadas
                    precio_lista: venta.precio,
                    total_pagado: venta.precio
                });

                // Agregar al historial local
                this.historial.push({
                    ...venta,
                    cliente: this.clienteSeleccionado.text,
                    fecha: new Date().toLocaleDateString(),
                    tipo: 'normal'
                });

                this.renderHistorial();
                this.limpiarFormulario();
                mostrarNotificacion('Venta registrada exitosamente.', 'success');
            }

        } catch (error) {
            console.error('Error confirmando venta:', error);
            const errorMessage = error.message || 'Error desconocido al registrar la venta';
            mostrarNotificacion(`Error al registrar la venta: ${errorMessage}`, 'error');
        }
    }

    obtenerTipoFichaId(nombreTratamiento) {
        // Mapear tratamientos a tipos de ficha específica según la migración
        const mapeo = {
            'DEPILACION': 1,        // DEPILACION
            'CORPORAL_FACIAL': 2,   // CORPORAL_FACIAL (actualizado)
            'FACIAL': 3,            // FACIAL
            'CAPILAR': 4            // CAPILAR
        };

        // Buscar coincidencias más específicas
        const nombreUpper = nombreTratamiento.toUpperCase();
        
        if (nombreUpper.includes('DEPILACION') || nombreUpper.includes('LASER')) {
            return 1; // DEPILACION
        } else if (nombreUpper.includes('CORPORAL') || nombreUpper.includes('FACIAL') || nombreUpper.includes('LIPO')) {
            return 2; // CORPORAL_FACIAL
        } else if (nombreUpper.includes('FACIAL')) {
            return 3; // FACIAL
        } else if (nombreUpper.includes('CAPILAR') || nombreUpper.includes('CABELLO')) {
            return 4; // CAPILAR
        }

        return 1; // Por defecto DEPILACION
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
        } catch (error) {
            console.error('Error cargando historial del cliente:', error);
            const errorMessage = error.message || 'Error desconocido cargando historial';
            mostrarNotificacion(`Error cargando historial del cliente: ${errorMessage}`, 'error');
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
        // Limpiar Select2 del cliente
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect && typeof $ !== 'undefined' && $.fn.select2) {
            $(clienteSelect).val(null).trigger('change');
        }
        
        // Limpiar otros campos
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
        
        // Resetear cliente seleccionado
        this.clienteSeleccionado = null;
        
        // Mostrar notificación
        mostrarNotificacion('Formulario de venta limpiado', 'info');
    }

    // Método para obtener ventas (usado por main.js)
    getVentas() {
        return this.ventas;
    }

    // Método para cargar ventas (usado por main.js)
    async loadVentas() {
        try {
            // Cargar todas las ventas usando API client
            this.ventas = await ventasAPI.getAll();
            console.log('✅ Ventas cargadas:', this.ventas.length);
  } catch (error) {
            console.error('❌ Error cargando ventas:', error);
            const errorMessage = error.message || 'Error desconocido cargando ventas';
            mostrarNotificacion(`Error cargando ventas: ${errorMessage}`, 'error');
        }
    }

    // Método para cargar pacientes (usado por main.js)
    async loadPacientes() {
        try {
            // Los pacientes se cargan automáticamente con Select2 AJAX
            console.log('✅ Select2 configurado para cargar pacientes automáticamente');
        } catch (error) {
            console.error('❌ Error configurando Select2:', error);
            const errorMessage = error.message || 'Error desconocido configurando Select2';
            mostrarNotificacion(`Error configurando selector de pacientes: ${errorMessage}`, 'error');
        }
    }

    // Método para buscar ventas (usado por main.js)
    buscarVentas(termino) {
        if (!termino) {
            this.renderHistorial();
            return;
        }

        const ventasFiltradas = this.historial.filter(venta => 
            venta.tratamiento?.toLowerCase().includes(termino.toLowerCase()) ||
            venta.cliente?.toLowerCase().includes(termino.toLowerCase())
        );

        this.renderVentasFiltradas(ventasFiltradas);
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

// Exportar instancia del módulo
export const ventasModule = new VentasModule();
