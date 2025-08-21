/**
 * Módulo de Gestión de Ventas
 * Maneja ventas con soporte para zonas del cuerpo
 */

import { fichasAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

class VentasModule {
    constructor() {
        this.ventas = [];
        this.tratamientos = [];
        this.packs = [];
        this.ofertas = [];
        this.clienteSeleccionado = null;
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.configurarEventos();
    }

    async cargarDatos() {
        try {
            // Cargar tratamientos disponibles
            const responseTratamientos = await fetch('/api.php/tratamientos');
            const tratamientosData = await responseTratamientos.json();
            this.tratamientos = tratamientosData.data || [];

            // Cargar packs por tratamiento
            for (const tratamiento of this.tratamientos) {
                const responsePacks = await fetch(`/api.php/packs/tratamiento/${tratamiento.id}`);
                const packsData = await responsePacks.json();
                tratamiento.packs = packsData.data || [];
            }

            // Cargar ofertas aplicables
            const responseOfertas = await fetch('/api.php/ofertas/aplicables');
            const ofertasData = await responseOfertas.json();
            this.ofertas = ofertasData.data || [];

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
        // Configurar select de cliente
        const selectCliente = document.getElementById('cliente');
        if (selectCliente) {
            selectCliente.addEventListener('change', (e) => {
                this.clienteSeleccionado = e.target.value;
                this.cargarHistorialCliente();
            });
        }

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

        selectTratamiento.innerHTML = '<option value="">-- Selecciona tratamiento --</option>';
        
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

        packSelect.innerHTML = '<option value="">-- Selecciona pack --</option>';
        
        if (tratamiento && tratamiento.packs && tratamiento.packs.length > 0) {
            packsDiv.style.display = 'block';
            
            tratamiento.packs.forEach((pack, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                
                const precioActual = pack.precio_oferta || pack.precio_regular;
                const precioRegular = pack.precio_regular;
                
                option.textContent = `${pack.nombre} - $${precioRegular.toLocaleString()}`;
                if (pack.precio_oferta) {
                    option.textContent += ` (oferta $${precioActual.toLocaleString()})`;
                }
                
                packSelect.appendChild(option);
            });
        } else {
            packsDiv.style.display = 'none';
        }

        sesionesDiv.style.display = 'block';
    }

    calcularPrecio() {
        const selectTratamiento = document.getElementById('tratamiento');
        const inputSesiones = document.getElementById('sesiones');
        const inputOferta = document.getElementById('ofertaVenta');
        const selectPack = document.getElementById('pack');
        const resultado = document.getElementById('resultado');

        if (!selectTratamiento || !inputSesiones || !inputOferta || !selectPack || !resultado) return;

        const tratamientoId = parseInt(selectTratamiento.value);
        const sesiones = parseInt(inputSesiones.value) || 1;
        const ofertaVenta = parseInt(inputOferta.value) || 0;
        const packIndex = selectPack.value;

        if (!tratamientoId) {
            resultado.textContent = 'Selecciona un tratamiento.';
            return;
        }

        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        let precio = 0;
        let detalle = '';

        // Si se seleccionó un pack
        if (packIndex !== '') {
            const pack = tratamiento.packs[packIndex];
            precio = pack.precio_oferta || pack.precio_regular;
            detalle = `Pack seleccionado: ${pack.nombre} → $${precio.toLocaleString()}`;
        } else {
            // Modalidad sesión individual
            const precioSesion = this.obtenerPrecioSesionTratamiento(tratamiento);
            precio = sesiones * precioSesion;
            detalle = `Sesión x${sesiones}: $${precio.toLocaleString()}`;
        }

        // Oferta adicional en la venta
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

        return {
            tratamiento: tratamiento.nombre,
            tratamiento_id: tratamiento.id,
            pack_id: packIndex !== '' ? tratamiento.packs[packIndex].id : null,
            sesiones,
            precio,
            detalle,
            oferta_adicional: ofertaVenta
        };
    }

    obtenerPrecioSesionTratamiento(tratamiento) {
        // Buscar precio de sesión individual del tratamiento
        // Esto se puede implementar consultando la tabla precio_tratamiento
        return 80000; // Precio por defecto, se debe obtener de la BD
    }

    async confirmarVenta() {
        const selectCliente = document.getElementById('cliente');
        if (!selectCliente || !selectCliente.value) {
            mostrarNotificacion('Selecciona un cliente primero.', 'warning');
            return;
        }

        const ventaData = this.calcularPrecio();
        if (!ventaData) {
            mostrarNotificacion('Error calculando precio de venta', 'error');
            return;
        }

        try {
            const ventaCompleta = {
                ficha_id: parseInt(selectCliente.value),
                tratamiento_id: ventaData.tratamiento_id,
                pack_id: ventaData.pack_id,
                cantidad_sesiones: ventaData.sesiones,
                precio_lista: ventaData.precio,
                descuento_manual_pct: ventaData.oferta_adicional,
                observaciones: ventaData.detalle
            };

            const response = await fetch('/api.php/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ventaCompleta)
            });

            const result = await response.json();

            if (result.success) {
                this.ventas.push(ventaData);
                this.renderHistorial();
                this.limpiarFormulario();
                mostrarNotificacion('Venta registrada exitosamente.', 'success');
            } else {
                mostrarNotificacion(result.error || 'Error registrando venta', 'error');
            }

        } catch (error) {
            console.error('Error confirmando venta:', error);
            mostrarNotificacion('Error registrando venta', 'error');
        }
    }

    async cargarHistorialCliente() {
        if (!this.clienteSeleccionado) return;

        try {
            const response = await fetch(`/api.php/ventas/historial/${this.clienteSeleccionado}`);
            const result = await response.json();
            
            if (result.success) {
                this.ventas = result.data || [];
                this.renderHistorial();
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    }

    renderHistorial() {
        const lista = document.getElementById('historialLista');
        if (!lista) return;

        if (this.ventas.length === 0) {
            lista.textContent = 'Sin compras registradas.';
            return;
        }

        lista.innerHTML = '';
        this.ventas.forEach((venta, i) => {
            const div = document.createElement('div');
            div.className = 'venta-item';
            div.innerHTML = `
                <strong>#${i + 1}</strong> - ${venta.tratamiento}  
                → $${venta.precio.toLocaleString()}<br>
                <small>${venta.detalle}</small>
            `;
            lista.appendChild(div);
        });
    }

    limpiarFormulario() {
        const selectTratamiento = document.getElementById('tratamiento');
        const selectPack = document.getElementById('pack');
        const inputSesiones = document.getElementById('sesiones');
        const inputOferta = document.getElementById('ofertaVenta');
        const resultado = document.getElementById('resultado');

        if (selectTratamiento) selectTratamiento.value = '';
        if (selectPack) selectPack.value = '';
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
}

// Exportar instancia del módulo
export const ventasModule = new VentasModule();
