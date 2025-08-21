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
            // PASO 1: Crear evaluación
            const evaluacionData = {
                ficha_id: parseInt(selectCliente.value),
                profesional_id: 1, // TODO: Obtener del usuario logueado
                tratamiento_id: ventaData.tratamiento_id,
                pack_id: ventaData.pack_id,
                precio_sugerido: ventaData.precio,
                sesiones_sugeridas: ventaData.sesiones,
                observaciones: ventaData.detalle,
                recomendaciones: 'Evaluación realizada durante la venta'
            };

            const evaluacion = await evaluacionesAPI.create(evaluacionData);

            // PASO 2: Crear ficha específica
            const tratamiento = this.tratamientos.find(t => t.id === ventaData.tratamiento_id);
            const tipoFichaId = this.obtenerTipoFichaId(tratamiento.nombre);
            
            const fichaEspecificaData = {
                evaluacion_id: evaluacion.id,
                tipo_id: tipoFichaId,
                datos: this.generarDatosFichaEspecifica(tratamiento, ventaData),
                observaciones: 'Ficha específica creada durante la venta'
            };

            const fichaEspecifica = await fichasEspecificasAPI.create(fichaEspecificaData);

            // PASO 3: Crear venta
            const ventaCompleta = {
                ficha_id: parseInt(selectCliente.value),
                evaluacion_id: evaluacion.id,
                ficha_especifica_id: fichaEspecifica.id,
                tratamiento_id: ventaData.tratamiento_id,
                pack_id: ventaData.pack_id,
                cantidad_sesiones: ventaData.sesiones,
                precio_lista: ventaData.precio,
                descuento_manual_pct: ventaData.oferta_adicional
            };

            const venta = await ventasAPI.create(ventaCompleta);

            if (venta.id) {
                this.ventas.push(ventaData);
                this.renderHistorial();
                this.limpiarFormulario();
                mostrarNotificacion('Venta registrada exitosamente con evaluación y ficha específica.', 'success');
            }

  } catch (error) {
            console.error('Error confirmando venta:', error);
            mostrarNotificacion('Error registrando venta: ' + error.message, 'error');
        }
    }

    obtenerTipoFichaId(nombreTratamiento) {
        // Mapear tratamientos a tipos de ficha específica
        const mapeo = {
            'DEPILACION': 1, // DEPILACION
            'FACIAL': 3,     // FACIAL
            'CORPORAL': 2,   // CORPORAL
            'CAPILAR': 4     // CAPILAR
        };
        
        for (const [key, value] of Object.entries(mapeo)) {
            if (nombreTratamiento.toUpperCase().includes(key)) {
                return value;
            }
        }
        
        return 1; // Por defecto DEPILACION
    }

    generarDatosFichaEspecifica(tratamiento, ventaData) {
        const datos = {
            tratamiento: tratamiento.nombre,
            pack_seleccionado: ventaData.pack_id ? 'Sí' : 'No',
            sesiones: ventaData.sesiones,
            precio: ventaData.precio,
            fecha_creacion: new Date().toISOString()
        };

        // Datos específicos según el tipo de tratamiento
        if (tratamiento.nombre.toUpperCase().includes('DEPILACION')) {
            datos.zonas = [];
            datos.intensidad_anterior = 'N/A';
            datos.observaciones_medicas = '';
        } else if (tratamiento.nombre.toUpperCase().includes('FACIAL')) {
            datos.tipo_piel = 'Por evaluar';
            datos.alergias = 'Por evaluar';
            datos.tratamientos_previos = 'Por evaluar';
        }

        return datos;
    }

    async cargarHistorialCliente() {
        if (!this.clienteSeleccionado) return;

        try {
            // Usar API client para obtener historial
            this.ventas = await ventasAPI.getByFichaId(this.clienteSeleccionado);
            this.renderHistorial();
        } catch (error) {
            console.error('Error cargando historial:', error);
            mostrarNotificacion('Error cargando historial del cliente', 'error');
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

    // Método para cargar ventas (usado por main.js)
    async loadVentas() {
        try {
            // Cargar todas las ventas usando API client
            this.ventas = await ventasAPI.getAll();
            console.log('✅ Ventas cargadas:', this.ventas.length);
  } catch (error) {
            console.error('❌ Error cargando ventas:', error);
            mostrarNotificacion('Error cargando ventas', 'error');
        }
    }

    // Método para cargar pacientes (usado por main.js)
    async loadPacientes() {
        try {
            // Cargar pacientes para el select de cliente
            const pacientes = await fichasAPI.getAll();
            this.cargarPacientesEnSelect(pacientes);
            console.log('✅ Pacientes cargados para ventas:', pacientes.length);
        } catch (error) {
            console.error('❌ Error cargando pacientes para ventas:', error);
            mostrarNotificacion('Error cargando pacientes', 'error');
        }
    }

    cargarPacientesEnSelect(pacientes) {
        const selectCliente = document.getElementById('cliente');
        if (!selectCliente) return;

        // Limpiar opciones existentes
        selectCliente.innerHTML = '<option value="">Seleccionar cliente...</option>';

        // Agregar pacientes
        pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id;
            option.textContent = `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut}`;
            selectCliente.appendChild(option);
        });
    }

    // Método para buscar ventas (usado por main.js)
    buscarVentas(termino) {
        if (!termino) {
            // Si no hay término de búsqueda, mostrar todas las ventas
            this.renderHistorial();
            return;
        }

        const ventasFiltradas = this.ventas.filter(venta => 
            venta.tratamiento?.toLowerCase().includes(termino.toLowerCase()) ||
            venta.cliente?.toLowerCase().includes(termino.toLowerCase()) ||
            venta.id?.toString().includes(termino)
        );

        // Renderizar ventas filtradas
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
