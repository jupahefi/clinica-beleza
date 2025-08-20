// Calendario Component - Inspirado en EventCalendar
// https://github.com/vkurko/calendar

class Calendar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            initialView: 'week',
            initialDate: new Date(),
            slotDuration: 30,
            slotMinTime: '08:00:00',
            slotMaxTime: '20:00:00',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            weekends: true,
            events: [],
            ...options
        };
        
        this.currentDate = new Date(this.options.initialDate);
        this.currentView = this.options.initialView;
        this.events = [];
        this.boxes = [];
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.loadEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <h2 class="calendar-title" id="calendar-title">Calendario</h2>
                    <div class="calendar-controls">
                        <button class="calendar-nav-btn" id="calendar-prev">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div class="calendar-view-buttons">
                            <button class="calendar-view-btn ${this.currentView === 'day' ? 'active' : ''}" data-view="day">Día</button>
                            <button class="calendar-view-btn ${this.currentView === 'week' ? 'active' : ''}" data-view="week">Semana</button>
                            <button class="calendar-view-btn ${this.currentView === 'month' ? 'active' : ''}" data-view="month">Mes</button>
                        </div>
                        <button class="calendar-nav-btn" id="calendar-next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                
                <div class="calendar-toolbar">
                    <button class="calendar-today-btn" id="calendar-today">Hoy</button>
                    <div class="calendar-filters">
                        <select class="calendar-filter-select" id="calendar-box-filter">
                            <option value="">Todos los boxes</option>
                        </select>
                        <select class="calendar-filter-select" id="calendar-status-filter">
                            <option value="">Todos los estados</option>
                            <option value="agendada">Agendada</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="en_curso">En Curso</option>
                            <option value="completada">Completada</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>
                </div>
                
                <div class="calendar-content" id="calendar-content">
                    <div class="calendar-loading">Cargando calendario...</div>
                </div>
            </div>
        `;
        
        this.renderCalendar();
    }
    
    renderCalendar() {
        const content = document.getElementById('calendar-content');
        
        switch (this.currentView) {
            case 'day':
                this.renderDayView(content);
                break;
            case 'week':
                this.renderWeekView(content);
                break;
            case 'month':
                this.renderMonthView(content);
                break;
        }
        
        this.updateTitle();
    }
    
    renderDayView(container) {
        const date = this.currentDate;
        const dayStart = new Date(date);
        dayStart.setHours(8, 0, 0, 0);
        
        const dayEnd = new Date(date);
        dayEnd.setHours(20, 0, 0, 0);
        
        const timeSlots = this.generateTimeSlots(dayStart, dayEnd, 60);
        const dayEvents = this.getEventsForDate(date);
        
        container.innerHTML = `
            <div class="calendar-day-view">
                <div class="calendar-day-time-slots">
                    ${timeSlots.map(slot => `
                        <div class="calendar-day-time-slot">${slot}</div>
                    `).join('')}
                </div>
                <div class="calendar-day-events">
                    ${timeSlots.map(slot => `
                        <div class="calendar-day-event-slot" data-time="${slot}">
                            ${this.renderEventsInSlot(dayEvents, slot)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderWeekView(container) {
        const weekStart = this.getWeekStart(this.currentDate);
        const weekDays = this.getWeekDays(weekStart);
        const weekEvents = this.getEventsForWeek(weekStart);
        
        container.innerHTML = `
            <div class="calendar-grid">
                <div class="calendar-time-header">Hora</div>
                ${weekDays.map(day => `
                    <div class="calendar-day-header ${this.isToday(day) ? 'today' : ''}">
                        <div class="calendar-day-name">${this.formatDayName(day)}</div>
                        <div class="calendar-day-number">${day.getDate()}</div>
                    </div>
                `).join('')}
                
                ${this.generateTimeSlots().map(time => `
                    <div class="calendar-time-slot">
                        <div class="calendar-time-label">${time}</div>
                    </div>
                    ${weekDays.map(day => `
                        <div class="calendar-time-slot" data-date="${this.formatDate(day)}" data-time="${time}">
                            ${this.renderEventsInSlot(weekEvents, time, day)}
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        `;
    }
    
    renderMonthView(container) {
        const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const calendarStart = this.getWeekStart(monthStart);
        const calendarEnd = this.getWeekEnd(monthEnd);
        
        const monthEvents = this.getEventsForMonth(this.currentDate);
        
        container.innerHTML = `
            <div class="calendar-month-view">
                ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => `
                    <div class="calendar-day-header">${day}</div>
                `).join('')}
                
                ${this.generateMonthDays(calendarStart, calendarEnd).map(day => `
                    <div class="calendar-month-day ${this.isToday(day) ? 'today' : ''} ${this.isOtherMonth(day) ? 'other-month' : ''}">
                        <div class="calendar-month-day-number">${day.getDate()}</div>
                        <div class="calendar-month-events">
                            ${this.renderMonthEvents(monthEvents, day)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    generateTimeSlots(start = null, end = null, duration = 30) {
        const slots = [];
        const startTime = start || new Date();
        startTime.setHours(8, 0, 0, 0);
        
        const endTime = end || new Date();
        endTime.setHours(20, 0, 0, 0);
        
        const current = new Date(startTime);
        
        while (current < endTime) {
            slots.push(this.formatTime(current));
            current.setMinutes(current.getMinutes() + duration);
        }
        
        return slots;
    }
    
    generateMonthDays(start, end) {
        const days = [];
        const current = new Date(start);
        
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        
        return days;
    }
    
    renderEventsInSlot(events, time, date = null) {
        const slotEvents = events.filter(event => {
            const eventTime = this.formatTime(new Date(event.fecha_inicio));
            const eventDate = date ? this.formatDate(new Date(event.fecha_inicio)) : this.formatDate(new Date(event.fecha_inicio));
            
            return eventTime === time && (!date || eventDate === this.formatDate(date));
        });
        
        return slotEvents.map(event => `
            <div class="calendar-event ${event.estado}" 
                 data-event-id="${event.id}"
                 style="top: ${this.calculateEventPosition(event)}px; height: ${this.calculateEventHeight(event)}px;">
                <div class="calendar-event-title">${event.titulo}</div>
                <div class="calendar-event-time">${this.formatTime(new Date(event.fecha_inicio))} - ${this.formatTime(new Date(event.fecha_fin))}</div>
            </div>
        `).join('');
    }
    
    renderMonthEvents(events, day) {
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.fecha_inicio);
            return this.isSameDay(eventDate, day);
        });
        
        return dayEvents.slice(0, 3).map(event => `
            <div class="calendar-month-event ${event.estado}" data-event-id="${event.id}">
                ${event.titulo}
            </div>
        `).join('');
    }
    
    calculateEventPosition(event) {
        const startTime = new Date(event.fecha_inicio);
        const minutes = startTime.getHours() * 60 + startTime.getMinutes();
        return (minutes - 8 * 60) * (60 / 30); // 60px por hora, 30 minutos por slot
    }
    
    calculateEventHeight(event) {
        const startTime = new Date(event.fecha_inicio);
        const endTime = new Date(event.fecha_fin);
        const duration = (endTime - startTime) / (1000 * 60); // duración en minutos
        return duration * (60 / 30); // 60px por hora, 30 minutos por slot
    }
    
    updateTitle() {
        const title = document.getElementById('calendar-title');
        const options = { year: 'numeric', month: 'long' };
        
        switch (this.currentView) {
            case 'day':
                title.textContent = this.currentDate.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                break;
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = this.getWeekEnd(this.currentDate);
                title.textContent = `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                break;
            case 'month':
                title.textContent = this.currentDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
                break;
        }
    }
    
    bindEvents() {
        // Navegación
        document.getElementById('calendar-prev').addEventListener('click', () => this.navigate(-1));
        document.getElementById('calendar-next').addEventListener('click', () => this.navigate(1));
        document.getElementById('calendar-today').addEventListener('click', () => this.goToToday());
        
        // Cambio de vista
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.changeView(view);
            });
        });
        
        // Filtros
        document.getElementById('calendar-box-filter').addEventListener('change', (e) => {
            this.filterByBox(e.target.value);
        });
        
        document.getElementById('calendar-status-filter').addEventListener('change', (e) => {
            this.filterByStatus(e.target.value);
        });
        
        // Eventos del calendario
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.calendar-event')) {
                const eventId = e.target.closest('.calendar-event').dataset.eventId;
                this.showEventModal(eventId);
            }
        });
    }
    
    navigate(direction) {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
        }
        
        this.renderCalendar();
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }
    
    changeView(view) {
        this.currentView = view;
        
        // Actualizar botones activos
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.renderCalendar();
    }
    
    filterByBox(boxId) {
        // Implementar filtro por box
        console.log('Filtrar por box:', boxId);
        this.renderCalendar();
    }
    
    filterByStatus(status) {
        // Implementar filtro por estado
        console.log('Filtrar por estado:', status);
        this.renderCalendar();
    }
    
    async loadEvents() {
        try {
            // Usar la nueva API
            const response = await fetch('/api.php/sesiones');
            const data = await response.json();
            
            if (data.success) {
                this.events = data.data || [];
                this.renderCalendar();
            } else {
                this.events = [];
                console.warn('No se pudieron cargar los eventos:', data.error);
            }
        } catch (error) {
            console.error('Error cargando eventos:', error);
            this.events = [];
        }
    }
    
    async loadBoxes() {
        try {
            // Usar la nueva API
            const response = await fetch('/api.php/boxes');
            const data = await response.json();
            
            if (data.success) {
                this.boxes = data.data || [];
                this.updateBoxFilter();
            } else {
                this.boxes = [];
                console.warn('No se pudieron cargar los boxes:', data.error);
            }
        } catch (error) {
            console.error('Error cargando boxes:', error);
            this.boxes = [];
        }
    }
    
    updateBoxFilter() {
        const select = document.getElementById('calendar-box-filter');
        if (!select) return;
        
        select.innerHTML = '<option value="">Todos los boxes</option>';
        
        if (this.boxes && Array.isArray(this.boxes)) {
            this.boxes.forEach(box => {
                const option = document.createElement('option');
                option.value = box.id;
                option.textContent = box.nombre;
                select.appendChild(option);
            });
        }
    }
    
    showEventModal(eventId) {
        if (!this.events || !Array.isArray(this.events)) return;
        const event = this.events.find(e => e.id == eventId);
        if (!event) return;
        
        const modal = document.createElement('div');
        modal.className = 'calendar-event-modal';
        modal.innerHTML = `
            <div class="calendar-event-modal-content">
                <div class="calendar-event-modal-header">
                    <h3 class="calendar-event-modal-title">${event.titulo}</h3>
                    <button class="calendar-event-modal-close">&times;</button>
                </div>
                
                <div class="calendar-event-details">
                    <div class="calendar-event-detail">
                        <span class="calendar-event-detail-label">Paciente:</span>
                        <span class="calendar-event-detail-value">${event.paciente_nombre}</span>
                    </div>
                    <div class="calendar-event-detail">
                        <span class="calendar-event-detail-label">Fecha:</span>
                        <span class="calendar-event-detail-value">${this.formatDateTime(new Date(event.fecha_inicio))}</span>
                    </div>
                    <div class="calendar-event-detail">
                        <span class="calendar-event-detail-label">Box:</span>
                        <span class="calendar-event-detail-value">${event.box_nombre}</span>
                    </div>
                    <div class="calendar-event-detail">
                        <span class="calendar-event-detail-label">Estado:</span>
                        <span class="calendar-event-detail-value">${this.formatStatus(event.estado)}</span>
                    </div>
                    ${event.observaciones ? `
                        <div class="calendar-event-detail">
                            <span class="calendar-event-detail-label">Observaciones:</span>
                            <span class="calendar-event-detail-value">${event.observaciones}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="calendar-event-actions">
                    <button class="btn btn-secondary" onclick="calendar.editEvent(${event.id})">Editar</button>
                    <button class="btn btn-warning" onclick="calendar.rescheduleEvent(${event.id})">Reagendar</button>
                    <button class="btn btn-danger" onclick="calendar.cancelEvent(${event.id})">Cancelar</button>
                    <button class="btn btn-primary" onclick="calendar.closeModal()">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cerrar modal
        modal.querySelector('.calendar-event-modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    
    closeModal() {
        const modal = document.querySelector('.calendar-event-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Métodos de utilidad
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
    
    getWeekEnd(date) {
        const start = this.getWeekStart(date);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return end;
    }
    
    getWeekDays(start) {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(day.getDate() + i);
            days.push(day);
        }
        return days;
    }
    
    getEventsForDate(date) {
        if (!this.events || !Array.isArray(this.events)) return [];
        return this.events.filter(event => this.isSameDay(new Date(event.fecha_inicio), date));
    }
    
    getEventsForWeek(start) {
        if (!this.events || !Array.isArray(this.events)) return [];
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        
        return this.events.filter(event => {
            const eventDate = new Date(event.fecha_inicio);
            return eventDate >= start && eventDate < end;
        });
    }
    
    getEventsForMonth(date) {
        if (!this.events || !Array.isArray(this.events)) return [];
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        return this.events.filter(event => {
            const eventDate = new Date(event.fecha_inicio);
            return eventDate >= start && eventDate <= end;
        });
    }
    
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    isToday(date) {
        return this.isSameDay(date, new Date());
    }
    
    isOtherMonth(date) {
        return date.getMonth() !== this.currentDate.getMonth();
    }
    
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    formatDateTime(date) {
        return date.toLocaleString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatDayName(date) {
        return date.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    
    formatStatus(status) {
        const statusMap = {
            'agendada': 'Agendada',
            'confirmada': 'Confirmada',
            'en_curso': 'En Curso',
            'completada': 'Completada',
            'cancelada': 'Cancelada',
            'reagendada': 'Reagendada'
        };
        return statusMap[status] || status;
    }
    
    // Métodos para acciones de eventos
    editEvent(eventId) {
        // Implementar edición de evento
        console.log('Editar evento:', eventId);
    }
    
    rescheduleEvent(eventId) {
        // Implementar reagendamiento
        console.log('Reagendar evento:', eventId);
    }
    
    cancelEvent(eventId) {
        // Implementar cancelación
        console.log('Cancelar evento:', eventId);
    }
}

// Exportar para uso global
window.Calendar = Calendar;
