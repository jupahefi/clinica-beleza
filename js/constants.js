/**
 * Constantes de la aplicación
 * Datos maestros estáticos para formularios de fichas específicas
 * NOTA: Zonas del cuerpo, tratamientos y precios se obtienen desde la base de datos
 */

export const TIPOS_PIEL = [
  { value: 'fototipo_1', label: 'Fototipo I - Muy clara, siempre se quema, nunca se broncea' },
  { value: 'fototipo_2', label: 'Fototipo II - Clara, se quema fácilmente, se broncea mínimamente' },
  { value: 'fototipo_3', label: 'Fototipo III - Media, se quema moderadamente, se broncea gradualmente' },
  { value: 'fototipo_4', label: 'Fototipo IV - Media oscura, se quema mínimamente, se broncea bien' },
  { value: 'fototipo_5', label: 'Fototipo V - Oscura, raramente se quema, se broncea profusamente' },
  { value: 'fototipo_6', label: 'Fototipo VI - Muy oscura, nunca se quema, se broncea profusamente' }
];

export const ZONAS_TRATAMIENTO = [
  { value: 'cara', label: 'Cara' },
  { value: 'cuello', label: 'Cuello' },
  { value: 'escote', label: 'Escote' },
  { value: 'brazos', label: 'Brazos' },
  { value: 'manos', label: 'Manos' },
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'piernas', label: 'Piernas' },
  { value: 'pies', label: 'Pies' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'axilas', label: 'Axilas' },
  { value: 'ingles', label: 'Inglés' },
  { value: 'otro', label: 'Otro' }
];

export const FICHAS_ESPECIFICAS = [
  {
    id: 'depilacion',
    label: 'Depilación',
    campos: [
      { name: 'zonas_tratadas', label: 'Zonas tratadas', type: 'textarea', rows: 2 },
      { name: 'observaciones_medicas', label: 'Observaciones médicas', type: 'textarea', rows: 2 }
    ]
  },
  {
    id: 'corporal',
    label: 'Corporal/Facial',
    campos: [
      { name: 'tratamientos_previos', label: 'Tratamientos previos', type: 'textarea', rows: 2 },
      { name: 'objetivo_estetico', label: 'Objetivo estético', type: 'textarea', rows: 2 }
    ]
  }
];
