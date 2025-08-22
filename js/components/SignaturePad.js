/**
 * Componente de Firma Digital
 * Permite al paciente firmar el consentimiento de depilación
 */

export class SignaturePad {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            width: 400,
            height: 200,
            penColor: '#000000',
            backgroundColor: '#ffffff',
            ...options
        };
        
        this.isDrawing = false;
        this.points = [];
        this.init();
    }
    
    init() {
        // Crear canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.canvas.style.border = '2px solid #ccc';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.cursor = 'crosshair';
        
        // Contexto del canvas
        this.ctx = this.canvas.getContext('2d');
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.options.penColor;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Agregar canvas al contenedor
        this.container.appendChild(this.canvas);
        
        // Event listeners
        this.setupEventListeners();
        
        // Crear controles
        this.createControls();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch events para móviles
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }
    
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (e.type === 'touchstart') {
            this.startDrawing({ clientX: x, clientY: y });
        } else if (e.type === 'touchmove') {
            this.draw({ clientX: x, clientY: y });
        }
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.points = [{ x, y }];
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.points.push({ x, y });
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }
    
    stopDrawing() {
        this.isDrawing = false;
    }
    
    createControls() {
        const controls = document.createElement('div');
        controls.className = 'signature-controls';
        controls.style.marginTop = '10px';
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.justifyContent = 'center';
        
        // Botón limpiar
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🧹 Limpiar Firma';
        clearBtn.className = 'btn btn-secondary btn-sm';
        clearBtn.onclick = () => this.clear();
        
        // Botón cambiar color
        const colorBtn = document.createElement('input');
        colorBtn.type = 'color';
        colorBtn.value = this.options.penColor;
        colorBtn.style.width = '40px';
        colorBtn.style.height = '35px';
        colorBtn.style.border = 'none';
        colorBtn.style.borderRadius = '4px';
        colorBtn.style.cursor = 'pointer';
        colorBtn.onchange = (e) => {
            this.ctx.strokeStyle = e.target.value;
        };
        
        controls.appendChild(clearBtn);
        controls.appendChild(colorBtn);
        this.container.appendChild(controls);
    }
    
    clear() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.options.penColor;
        this.points = [];
    }
    
    isEmpty() {
        return this.points.length === 0;
    }
    
    getSignatureData() {
        return {
            imageData: this.canvas.toDataURL('image/png'),
            points: this.points,
            timestamp: new Date().toISOString()
        };
    }
    
    setSignatureData(data) {
        if (data.imageData) {
            const img = new Image();
            img.onload = () => {
                this.ctx.drawImage(img, 0, 0);
            };
            img.src = data.imageData;
        }
        if (data.points) {
            this.points = data.points;
        }
    }
    
    // Validar que la firma tenga suficiente contenido
    isValid() {
        if (this.points.length < 10) return false;
        
        // Calcular distancia total de la firma
        let totalDistance = 0;
        for (let i = 1; i < this.points.length; i++) {
            const dx = this.points[i].x - this.points[i-1].x;
            const dy = this.points[i].y - this.points[i-1].y;
            totalDistance += Math.sqrt(dx*dx + dy*dy);
        }
        
        return totalDistance > 50; // Mínimo 50px de trazo
    }
}

/**
 * Modal de Consentimiento con Firma
 */
export class ConsentimientoModal {
    constructor() {
        this.modal = null;
        this.signaturePad = null;
        this.onAccept = null;
        this.onReject = null;
    }
    
    show(consentimientoText, onAccept, onReject) {
        this.onAccept = onAccept;
        this.onReject = onReject;
        
        this.createModal(consentimientoText);
        document.body.appendChild(this.modal);
        
        // Inicializar firma después de que el modal esté en el DOM
        setTimeout(() => {
            this.signaturePad = new SignaturePad('signature-container', {
                width: 350,
                height: 150
            });
        }, 100);
    }
    
    createModal(consentimientoText) {
        this.modal = document.createElement('div');
        this.modal.className = 'consentimiento-modal';
        this.modal.innerHTML = `
            <div class="consentimiento-content">
                <div class="consentimiento-header">
                    <h3>📋 Consentimiento Informado - Depilación Láser</h3>
                    <button class="close-btn" onclick="this.closest('.consentimiento-modal').remove()">×</button>
                </div>
                
                <div class="consentimiento-body">
                    <div class="consentimiento-text">
                        ${consentimientoText}
                    </div>
                    
                    <div class="signature-section">
                        <h4>✍️ Firma del Paciente</h4>
                        <p>Por favor, firme en el recuadro de abajo para confirmar que ha leído y entendido el consentimiento:</p>
                        <div id="signature-container"></div>
                    </div>
                </div>
                
                <div class="consentimiento-footer">
                    <button class="btn btn-danger" onclick="this.closest('.consentimiento-modal').querySelector('.reject-btn').click()">
                        ❌ Rechazar
                    </button>
                    <button class="btn btn-success accept-btn" onclick="this.closest('.consentimiento-modal').querySelector('.accept-btn').click()">
                        ✅ Aceptar y Firmar
                    </button>
                </div>
            </div>
        `;
        
        // Event listeners
        this.modal.querySelector('.accept-btn').onclick = () => this.handleAccept();
        this.modal.querySelector('.reject-btn').onclick = () => this.handleReject();
        this.modal.querySelector('.close-btn').onclick = () => this.handleReject();
        
        // Cerrar al hacer clic fuera del modal
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.handleReject();
            }
        };
    }
    
    handleAccept() {
        if (!this.signaturePad || !this.signaturePad.isValid()) {
            mostrarNotificacion('⚠️ Por favor, complete su firma antes de continuar.', 'warning');
            return;
        }
        
        // Convertir canvas a blob
        this.signaturePad.canvas.toBlob((blob) => {
            if (this.onAccept) {
                this.onAccept(blob);
            }
            this.close();
        }, 'image/png');
    }
    
    handleReject() {
        if (this.onReject) {
            this.onReject();
        }
        this.close();
    }
    
    close() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
    }
}

// Agregar estilos CSS
const styles = `
.consentimiento-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.consentimiento-content {
    background: white;
    border-radius: 15px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.consentimiento-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 2px solid #f0f0f0;
}

.consentimiento-header h3 {
    margin: 0;
    color: #333;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 5px;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    background: #f0f0f0;
}

.consentimiento-body {
    padding: 20px;
}

.consentimiento-text {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.6;
    font-size: 14px;
}

.signature-section {
    margin-top: 20px;
}

.signature-section h4 {
    margin-bottom: 10px;
    color: #333;
}

.signature-section p {
    margin-bottom: 15px;
    color: #666;
    font-size: 14px;
}

.consentimiento-footer {
    display: flex;
    justify-content: space-between;
    padding: 20px;
    border-top: 2px solid #f0f0f0;
    gap: 15px;
}

.consentimiento-footer .btn {
    flex: 1;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: 600;
}

@media (max-width: 768px) {
    .consentimiento-content {
        width: 95%;
        margin: 10px;
    }
    
    .consentimiento-footer {
        flex-direction: column;
    }
    
    .consentimiento-footer .btn {
        width: 100%;
    }
}
`;

// Agregar estilos al documento
if (!document.getElementById('consentimiento-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'consentimiento-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
