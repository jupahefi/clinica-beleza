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
        this.pacientes = [];
        this.historial = [];
        this.clienteSeleccionado = null;
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.configurarEventos();
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

            // Cargar pacientes para el selector
            await this.cargarPacientesEnSelect();

            console.log('Datos de ventas cargados:', {
                tratamientos: this.tratamientos.length,
                ofertas: this.ofertas.length
            });

        } catch (error) {
            console.error('Error cargando datos de ventas:', error);
            mostrarNotificacion('Error cargando datos de ventas', 'error');
        }
    }

    configurarEventos() {
        // Configurar Select2 para el selector de pacientes
        this.configurarSelect2Pacientes();

        // Cargar tratamientos en el select
        this.cargarTratamientosEnSelect();

        // Hacer el módulo disponible globalmente para los onclick del HTML
        window.ventasModule = this;
    }

    async cargarPacientesEnSelect() {
        try {
            const pacientes = await fichasAPI.getAll();
            this.pacientes = pacientes;
            console.log('Pacientes cargados para ventas:', pacientes.length);
        } catch (error) {
            console.error('Error cargando pacientes para ventas:', error);
            mostrarNotificacion('Error cargando pacientes', 'error');
        }
    }

    configurarSelect2Pacientes() {
        const selectCliente = document.getElementById('cliente');
        if (!selectCliente) return;

        // Configurar Select2 con AJAX
        $(selectCliente).select2({
            placeholder: '-- Selecciona cliente --',
            allowClear: true,
            ajax: {
                url: '/api.php/fichas',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        search: params.term || '',
                        page: params.page || 1
                    };
                },
                processResults: function (data) {
                    return {
                        results: data.data.map(paciente => ({
                            id: paciente.id,
                            text: `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut || 'Sin RUT'}`
                        }))
                    };
                },
                cache: true
            },
            minimumInputLength: 1
        });

        // Evento cuando se selecciona un paciente
        $(selectCliente).on('select2:select', (e) => {
            this.clienteSeleccionado = e.params.data.id;
            this.cargarHistorialCliente();
        });
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
            packsDiv.style.display = 'block';
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
            packsDiv.style.display = 'none';
        }

        sesionesDiv.style.display = 'block';
    }

    calcularPrecio() {
        const selectTratamiento = document.getElementById('tratamiento');
        const sesiones = parseInt(document.getElementById('sesiones')?.value) || 1;
        const ofertaVenta = parseInt(document.getElementById('ofertaVenta')?.value) || 0;
        const packIndex = document.getElementById('pack')?.value;
        const resultado = document.getElementById('resultado');

        if (!selectTratamiento || !resultado) return;

        const tratamientoId = parseInt(selectTratamiento.value);
        if (!tratamientoId) {
            resultado.innerHTML = 'Selecciona un tratamiento.';
            return;
        }

        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        let precio = 0;
        let detalle = '';

        // Si se seleccionó un pack
        if (packIndex !== '' && packIndex !== undefined) {
            const pack = tratamiento.packs[packIndex];
            precio = pack.precio_oferta || pack.precio_regular;
            detalle = `Pack seleccionado: ${pack.nombre} → $${precio.toLocaleString()}`;
        } else {
            // Modalidad sesión individual
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
        const cliente = document.getElementById('cliente')?.value;
        if (!cliente) {
            mostrarNotificacion('Selecciona un cliente primero.', 'error');
            return;
        }

        const venta = this.calcularPrecio();
        if (!venta) {
            mostrarNotificacion('Selecciona un tratamiento válido.', 'error');
            return;
        }

        try {
            // Aquí implementarías la lógica para guardar la venta
            // Por ahora solo agregamos al historial local
            this.historial.push({
                ...venta,
                cliente: cliente,
                fecha: new Date().toLocaleDateString()
            });

            this.renderHistorial();
            mostrarNotificacion('Venta registrada exitosamente.', 'success');
        } catch (error) {
            console.error('Error confirmando venta:', error);
            mostrarNotificacion('Error al registrar la venta.', 'error');
        }
    }

    renderHistorial() {
        const lista = document.getElementById('historialLista');
        if (!lista) return;

        if (!this.historial || this.historial.length === 0) {
            lista.innerHTML = 'Sin compras registradas.';
            return;
        }

        lista.innerHTML = '';
        this.historial.forEach((v, i) => {
            const div = document.createElement('div');
            div.className = 'venta-item';
            div.innerHTML = `
                <strong>#${i+1}</strong> - ${v.tratamiento}  
                → $${v.precio.toLocaleString()}<br>
                <small>${v.detalle}</small>
            `;
            lista.appendChild(div);
        });
    }

    limpiarFormulario() {
        document.getElementById('tratamiento').value = '';
        document.getElementById('pack').value = '';
        document.getElementById('sesiones').value = '1';
        document.getElementById('ofertaVenta').value = '0';
        document.getElementById('resultado').innerHTML = 'Selecciona tratamiento y modalidad para calcular el precio.';
        document.getElementById('packsDiv').style.display = 'none';
    }

    async cargarHistorialCliente() {
        if (!this.clienteSeleccionado) return;

        try {
            const historial = await ventasAPI.getByFichaId(this.clienteSeleccionado);
            this.renderHistorial();
        } catch (error) {
            console.error('Error cargando historial del cliente:', error);
        }
    }

    // Métodos para compatibilidad con main.js
    loadVentas() {
        // Este método se llama desde main.js
        console.log('Cargando ventas...');
    }

    loadPacientes() {
        // Este método se llama desde main.js
        console.log('Cargando pacientes para ventas...');
    }

    cargarPacientesEnSelect(pacientes) {
        // Este método se llama desde main.js
        this.pacientes = pacientes;
    }

    buscarVentas(termino) {
        // Implementar búsqueda de ventas
        console.log('Buscando ventas:', termino);
    }

    renderVentasFiltradas(ventas) {
        // Implementar renderizado de ventas filtradas
        console.log('Renderizando ventas filtradas:', ventas);
    }
}

export default VentasModule;
