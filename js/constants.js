/**
 * Constantes de la aplicación
 * Datos maestros estáticos para tipos de piel y zonas de tratamiento
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

// ZONAS DEL CUERPO PARA DEPILACIÓN
export const ZONAS_CUERPO = {
    PIERNAS: 'PIERNAS',
    BRAZOS: 'BRAZOS', 
    REBAJE: 'REBAJE',
    INTERGLUTEO: 'INTERGLUTEO',
    ROSTRO_C: 'ROSTRO C',
    CUELLO: 'CUELLO',
    BOZO: 'BOZO',
    AXILA: 'AXILA',
    MENTON: 'MENTON',
    PATILLAS: 'PATILLAS',
    ESPALDA: 'ESPALDA',
    ABDOMEN: 'ABDOMEN',
    GLUTEOS: 'GLUTEOS',
    PECHO: 'PECHO',
    BARBA: 'BARBA',
    DEDOS_MANOS: 'DEDOS-MANOS',
    EMPEINE_DEDOS: 'EMPEINE- DEDOS',
    LINEA_ALBA: 'LINEA ALBA'
};

export const ZONAS_CUERPO_LABELS = {
    [ZONAS_CUERPO.PIERNAS]: 'Piernas',
    [ZONAS_CUERPO.BRAZOS]: 'Brazos',
    [ZONAS_CUERPO.REBAJE]: 'Rebaje',
    [ZONAS_CUERPO.INTERGLUTEO]: 'Interglúteo',
    [ZONAS_CUERPO.ROSTRO_C]: 'Rostro C',
    [ZONAS_CUERPO.CUELLO]: 'Cuello',
    [ZONAS_CUERPO.BOZO]: 'Bozo',
    [ZONAS_CUERPO.AXILA]: 'Axila',
    [ZONAS_CUERPO.MENTON]: 'Mentón',
    [ZONAS_CUERPO.PATILLAS]: 'Patillas',
    [ZONAS_CUERPO.ESPALDA]: 'Espalda',
    [ZONAS_CUERPO.ABDOMEN]: 'Abdomen',
    [ZONAS_CUERPO.GLUTEOS]: 'Glúteos',
    [ZONAS_CUERPO.PECHO]: 'Pecho',
    [ZONAS_CUERPO.BARBA]: 'Barba',
    [ZONAS_CUERPO.DEDOS_MANOS]: 'Dedos-Manos',
    [ZONAS_CUERPO.EMPEINE_DEDOS]: 'Empeine-Dedos',
    [ZONAS_CUERPO.LINEA_ALBA]: 'Línea Alba'
};

// PRECIOS POR ZONA (para agregar/quitar zonas)
export const PRECIO_POR_ZONA = {
    [ZONAS_CUERPO.PIERNAS]: 45000,
    [ZONAS_CUERPO.BRAZOS]: 35000,
    [ZONAS_CUERPO.REBAJE]: 15000,
    [ZONAS_CUERPO.INTERGLUTEO]: 15000,
    [ZONAS_CUERPO.ROSTRO_C]: 25000,
    [ZONAS_CUERPO.CUELLO]: 20000,
    [ZONAS_CUERPO.BOZO]: 15000,
    [ZONAS_CUERPO.AXILA]: 20000,
    [ZONAS_CUERPO.MENTON]: 15000,
    [ZONAS_CUERPO.PATILLAS]: 15000,
    [ZONAS_CUERPO.ESPALDA]: 40000,
    [ZONAS_CUERPO.ABDOMEN]: 30000,
    [ZONAS_CUERPO.GLUTEOS]: 25000,
    [ZONAS_CUERPO.PECHO]: 30000,
    [ZONAS_CUERPO.BARBA]: 25000,
    [ZONAS_CUERPO.DEDOS_MANOS]: 20000,
    [ZONAS_CUERPO.EMPEINE_DEDOS]: 20000,
    [ZONAS_CUERPO.LINEA_ALBA]: 15000
};

// TRATAMIENTOS Y PRECIOS
export const TRATAMIENTOS = {
    FACIAL: {
        LIMPIEZA_FACIAL: {
            nombre: 'Limpieza facial profunda',
            precio: 39900,
            precio_promo: 24900,
            sesiones: 1
        },
        RADIOFRECUENCIA_FACIAL: {
            nombre: 'Radiofrecuencia facial',
            precio: 250000,
            precio_promo: 199000,
            sesiones: 6
        },
        CRIOLIPOLISIS_FACIAL: {
            nombre: 'Criolipolisis Facial Dinámica (reafirmante)',
            precio: 399000,
            precio_promo: 299000,
            sesiones: 6
        },
        HIFU_FACIAL: {
            nombre: 'Hifu Facial 4D',
            precio: 299000,
            precio_promo: 299000,
            sesiones: 2,
            incluye: 'PRP'
        },
        PLASMA_RICO: {
            nombre: 'Plasma rico en plaquetas',
            precio: 199000,
            precio_promo: 149900,
            sesiones: 3
        },
        RADIOFRECUENCIA_FRACCIONADA: {
            nombre: 'Radiofrecuencia Fraccionada + Vitamina C',
            precio: 450000,
            precio_promo: 390000,
            sesiones: 3
        },
        TECNOLOGIA_PLASMATICA: {
            nombre: 'Tecnología plasmatica párpados',
            precio: 350000,
            precio_promo: 250000,
            sesiones: 1,
            adicional: 'Lunares $100.000'
        },
        PINK_GLOW: {
            nombre: 'Pink Glow',
            precio: 189000,
            precio_promo: 139900,
            sesiones: 3,
            incluye: 'Ultrasonido'
        }
    },
    CAPILAR: {
        CARBOXITERAPIA: {
            nombre: 'Carboxiterapia',
            precio: 579000,
            precio_promo: 499000,
            sesiones: 6,
            incluye: 'Plasma rico en plaquetas, Fotobiomodulacion, 3 sesiones regalo dexpantenol vitaminas con dermapeen'
        }
    },
    DEPILACION: {
        CUERPO_COMPLETO: {
            nombre: 'Cuerpo completo',
            precio: 499000,
            precio_promo: 499000,
            sesiones: 6,
            zonas: [ZONAS_CUERPO.PIERNAS, ZONAS_CUERPO.BRAZOS, ZONAS_CUERPO.AXILA, ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO, ZONAS_CUERPO.ROSTRO_C, ZONAS_CUERPO.BOZO, ZONAS_CUERPO.MENTON, ZONAS_CUERPO.PATILLAS, ZONAS_CUERPO.ESPALDA, ZONAS_CUERPO.ABDOMEN, ZONAS_CUERPO.PECHO, ZONAS_CUERPO.BARBA, ZONAS_CUERPO.DEDOS_MANOS, ZONAS_CUERPO.EMPEINE_DEDOS, ZONAS_CUERPO.LINEA_ALBA]
        },
        CUERPO_COMPLETO_SIN_ROSTRO: {
            nombre: 'Cuerpo completo (sin rostro)',
            precio: 399000,
            precio_promo: 399000,
            sesiones: 6,
            zonas: [ZONAS_CUERPO.PIERNAS, ZONAS_CUERPO.BRAZOS, ZONAS_CUERPO.AXILA, ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO, ZONAS_CUERPO.ESPALDA, ZONAS_CUERPO.ABDOMEN, ZONAS_CUERPO.PECHO, ZONAS_CUERPO.BARBA, ZONAS_CUERPO.DEDOS_MANOS, ZONAS_CUERPO.EMPEINE_DEDOS, ZONAS_CUERPO.LINEA_ALBA]
        },
        ROSTRO_COMPLETO: {
            nombre: 'Rostro completo',
            precio: 149900,
            precio_promo: 149900,
            sesiones: 8,
            zonas: [ZONAS_CUERPO.ROSTRO_C, ZONAS_CUERPO.BOZO, ZONAS_CUERPO.MENTON, ZONAS_CUERPO.PATILLAS, ZONAS_CUERPO.CUELLO]
        },
        FULL_BODY: {
            nombre: 'Full body',
            precio: 259000,
            precio_promo: 199000,
            sesiones: 6,
            zonas: [ZONAS_CUERPO.PIERNAS, ZONAS_CUERPO.BRAZOS, ZONAS_CUERPO.AXILA, ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO]
        },
        SEMI_FULL: {
            nombre: 'Semi Full',
            precio: 199000,
            precio_promo: 159000,
            sesiones: 6,
            zonas: [ZONAS_CUERPO.PIERNAS, ZONAS_CUERPO.AXILA, ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO]
        },
        BIKINI_FULL: {
            nombre: 'Bikini full',
            precio: 99000,
            precio_promo: 79900,
            sesiones: 6,
            zonas: [ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO]
        },
        BIKINI_FULL_AXILAS: {
            nombre: 'Bikini full + axilas',
            precio: 120000,
            precio_promo: 99000,
            sesiones: 6,
            zonas: [ZONAS_CUERPO.REBAJE, ZONAS_CUERPO.INTERGLUTEO, ZONAS_CUERPO.AXILA]
        }
    }
};
