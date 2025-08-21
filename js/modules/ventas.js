/**
 * Módulo de Gestión de Ventas
 * Maneja ventas con el nuevo proceso: Evaluación -> Ficha Específica -> Venta
 */

import { fichasAPI, evaluacionesAPI, fichasEspecificasAPI, ventasAPI, tratamientosAPI, packsAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

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
        const inputSesiones = document.getElementById('sesiones');
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
            tratamiento.packs.forEach((pack, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                const precioTexto = pack.precio_oferta ? 
                    `$${pack.precio_oferta.toLocaleString()} (oferta)` : 
                    `$${pack.precio_regular.toLocaleString()}`;
                option.textContent = `${pack.nombre} - ${precioTexto}`;
                packSelect.appendChild(option);
            });
        } else {
            packsDiv.style.display = "none";
        }

        sesionesDiv.style.display = "block"; // siempre hay sesiones individuales
    }

    calcularPrecio() {
        const selectTratamiento = document.getElementById('tratamiento');
        const inputSesiones = document.getElementById('sesiones');
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
            detalle = `Pack seleccionado: ${pack.nombre} → $${precio.toLocaleString()}`;
        } else {
            // modalidad sesión
            precio = sesiones * (tratamiento.precio_oferta || tratamiento.precio_regular);
            detalle = `Sesión x${sesiones}: $${precio.toLocaleString()}`;
        }

        // Oferta adicional a la venta
        if (ofertaVenta > 0) {
            const descuento = (precio * ofertaVenta) / 100;
            precio = precio - descuento;
            detalle += `<br>Oferta adicional aplicada: -${ofertaVenta}%`;
        }

        resultado.innerHTML = `
            <strong>Tratamiento:</strong> ${tratamiento.nombre}<br>
            <strong>Precio final:</strong> $${precio.toLocaleString()}<br>
            <em>${detalle}</em>
        `;

        return { tratamiento: tratamiento.nombre, sesiones, precio, detalle };
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
            // Implementar el proceso de 3 pasos: Evaluación -> Ficha Específica -> Venta
            const evaluacion = await evaluacionesAPI.create({
                ficha_id: cliente,
                profesional_id: 1, // Por ahora hardcodeado
                recomendaciones: `Venta de ${venta.tratamiento}`
            });

            const fichaEspecifica = await fichasEspecificasAPI.create({
                evaluacion_id: evaluacion.id,
                tipo_ficha_especifica_id: this.obtenerTipoFichaId(venta.tratamiento),
                observaciones: venta.detalle
            });

            const ventaCreada = await ventasAPI.create({
                evaluacion_id: evaluacion.id,
                ficha_especifica_id: fichaEspecifica.id,
                tratamiento_id: document.getElementById('tratamiento').value,
                cantidad_sesiones: venta.sesiones,
                precio_lista: venta.precio,
                total_pagado: venta.precio
            });

            // Agregar al historial local
            this.historial.push({
                ...venta,
                cliente: this.clienteSeleccionado.text,
                fecha: new Date().toLocaleDateString()
            });

            this.renderHistorial();
            this.limpiarFormulario();
            mostrarNotificacion('Venta registrada exitosamente.', 'success');

        } catch (error) {
            console.error('Error confirmando venta:', error);
            // Mostrar el error completo como en el módulo de pacientes
            const errorMessage = error.message || 'Error desconocido al registrar la venta';
            mostrarNotificacion(`Error al registrar la venta: ${errorMessage}`, 'error');
        }
    }

    obtenerTipoFichaId(nombreTratamiento) {
        // Mapear tratamientos a tipos de ficha específica
        const mapeo = {
            'DEPILACION': 1, // DEPILACION
            'CORPORAL': 2,   // CORPORAL
            'FACIAL': 3,     // FACIAL
            'CAPILAR': 4     // CAPILAR
        };

        for (const [tipo, id] of Object.entries(mapeo)) {
            if (nombreTratamiento.toUpperCase().includes(tipo)) {
                return id;
            }
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
        const selectTratamiento = document.getElementById('tratamiento');
        const packSelect = document.getElementById('pack');
        const inputSesiones = document.getElementById('sesiones');
        const inputOferta = document.getElementById('ofertaVenta');
        const resultado = document.getElementById('resultado');

        if (selectTratamiento) selectTratamiento.value = '';
        if (packSelect) packSelect.value = '';
        if (inputSesiones) inputSesiones.value = '1';
        if (inputOferta) inputOferta.value = '0';
        if (resultado) resultado.textContent = 'Selecciona tratamiento y modalidad para calcular el precio.';

        const packsDiv = document.getElementById('packsDiv');
        if (packsDiv) packsDiv.style.display = 'none';
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
