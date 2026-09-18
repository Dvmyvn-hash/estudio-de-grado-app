/**
 * CASE GENERATOR AGENT - AGENTE DE IA GENERADOR DE CASOS PRÁCTICOS DE GRADO
 * Genera casos prácticos inéditos de nivel examen de grado con base estricta en el
 * Protocolo AFG 2026-20, Pauta de Análisis de Hechos 2026 y Rúbrica Oficial de Justificación.
 * 
 * Incorpora:
 * 1. Catálogo estructurado de Instituciones Jurídicas (Civil, Procesal, Constitucional).
 * 2. Motor de Incompatibilidad Dogmática con descarte automático y justificación técnica.
 * 3. 10 Arquetipos Dogmáticos de Alta Fidelidad basados en las Pautas Universitarias (AFG 2026).
 * 4. Motor Mutador Dinámico (cero repetición): nombres, lugares, montos, fechas y juzgados aleatorios.
 * 5. Barajado Aleatorio de Alternativas (A a E): la opción correcta nunca está fija en 'A'.
 * 6. Motor de Afinidad Ponderada para selecciones específicas y fallback inteligente a examen simulado.
 * 7. Pauta 2026 de Hechos (principales, secundarios, distractores, partes e instituciones) y Rúbrica de 4 Dimensiones.
 */

var CaseGeneratorAgent = {
  selectedInstitutions: new Set(),
  activeMode: "manual", // "manual" | "preset"
  selectedPresetId: null,
  isGenerating: false,

  // 0. CORPUS DOGMÁTICO DE FUENTES OFICIALES (fuentes/*.md) Y APUNTES (53 CÉDULAS)
  FUENTES_CORPUS: {
    "civil.md": {
      title: "Derecho Civil - Resumen de Cédulas de Examen de Grado",
      sections: [
        { name: "Teoría del Acto Jurídico", rules: "Arts. 1444-1458, 1681-1691 CC", doctrine: "Requisitos de existencia y validez. Error esencial y sustancial. Fuerza grave y determinante. Dolo coetáneo y determinante (reticencia). Lesión enorme como vicio objetivo taxativo. Nulidad absoluta (orden público, 10 años) vs Nulidad relativa (4 años)." },
        { name: "Teoría General de las Obligaciones", rules: "Arts. 1489, 1535, 1544, 1551, 1552 CC", doctrine: "Incumplimiento y condición resolutoria tácita. La mora purga la mora (exceptio non adimpleti contractus). Cláusula penal enorme y reducción legal al duplo del principal (Art. 1544 CC)." },
        { name: "Responsabilidad Civil Extracontractual", rules: "Arts. 2314-2334 CC", doctrine: "Capacidad delictual, culpa y dolo, daño cierto, causalidad adecuada. Presunciones de culpa y responsabilidad solidaria de coautores (Art. 2317 CC)." }
      ]
    },
    "derecho_de_bienes.md": {
      title: "Derecho Civil: Teoría de los Bienes y Derechos Reales",
      sections: [
        { name: "La Posesión y sus Elementos", rules: "Arts. 700, 714 CC", doctrine: "Corpus y animus. Posesión regular e irregular. Posesión viciosa. Mera tenencia que reconoce dominio ajeno." },
        { name: "Modos de Adquirir y Posesión Inscrita", rules: "Arts. 670, 686, 724, 728, 2505 CC", doctrine: "Tradición de inmuebles por competente inscripción conservatoria. Garantía de posesión inscrita contra apoderamiento material y prescripción adquisitiva sin título (Art. 2505 CC)." },
        { name: "Protección del Dominio", rules: "Arts. 889, 895 CC", doctrine: "Acción reivindicatoria privativa del dueño no poseedor contra el poseedor no dueño." }
      ]
    },
    "procesal.md": {
      title: "Derecho Procesal - Resumen de Cédulas de Examen de Grado",
      sections: [
        { name: "Jurisdicción y Competencia", rules: "Arts. 76 CPR, Arts. 1, 108-114, 134-187, 529 COT", doctrine: "Momentos jurisdiccionales. Reglas generales de competencia (radicación, grado, extensión, prevención, inexcusabilidad). Fuero general del demandado en acciones muebles. Perpetuidad del mandato judicial constituido a favor de abogados frente a la muerte del mandante (Art. 529 COT)." },
        { name: "Juicio Ordinario y Medidas Cautelares", rules: "Arts. 254, 279, 290, 298, 303, 309, 310 CPC", doctrine: "Período de discusión. Excepciones dilatorias y mixtas. Medidas prejudiciales y precautorias sujetas a proporcionalidad estricta y limitación a bienes necesarios (Art. 298 CPC)." },
        { name: "Recursos Procesales", rules: "Arts. 767, 768 CPC", doctrine: "Apelación ordinaria, casación en la forma (vicios in procedendo, ultra petita, falta de fundamentos) y casación en el fondo (errores in iudicando de derecho sustantivo)." }
      ]
    },
    "constitucional.md": {
      title: "Derecho Constitucional - Resumen de Cédulas de Examen de Grado",
      sections: [
        { name: "Bases de la Institucionalidad y Juridicidad", rules: "Arts. 1, 6, 7 CPR", doctrine: "Supremacía constitucional, vinculación directa, servicialidad del Estado y sanción de nulidad de derecho público." },
        { name: "Garantías Fundamentales", rules: "Art. 19 N° 1, 2, 3, 21, 24 CPR", doctrine: "Debido proceso, tribunal natural, orden público económico, derecho de propiedad y expropiación por daño patrimonial efectivamente causado." },
        { name: "Acciones Constitucionales", rules: "Arts. 20, 21, 93 N° 6 CPR", doctrine: "Recurso de protección como tutela urgente del statu quo posesorio frente a vías de hecho y actos de autotutela. Inaplicabilidad por inconstitucionalidad ante el Tribunal Constitucional." }
      ]
    }
  },

  async syncFuentesFromServer() {
    try {
      const res = await fetch("/api/fuentes");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.fuentes) {
          this.serverFuentes = data.fuentes;
        }
      }
    } catch (e) {}
  },

  // 1. CATÁLOGO GENERAL DE INSTITUCIONES JURÍDICAS DE EXAMEN DE GRADO
  INSTITUTIONS: [
    // --- DERECHO CIVIL: BIENES & DERECHOS REALES ---
    {
      id: "civ_tradicion_posesion",
      name: "Tradición y Posesión Inscrita",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 686, 724, 728, 2505 Código Civil",
      desc: "Teoría de la posesión inscrita, inscripción como requisito, garantía y prueba de posesión sobre inmuebles.",
      incompatibleWith: ["civ_prescripcion_extraordinaria_sin_titulo"],
      incompatibilityReasons: {
        civ_prescripcion_extraordinaria_sin_titulo: "Contra título inscrito no procede el apoderamiento material ni la prescripción adquisitiva extraordinaria sin previa cancelación (Art. 2505 CC)."
      }
    },
    {
      id: "civ_prescripcion_extraordinaria_sin_titulo",
      name: "Prescripción Adquisitiva Extraordinaria",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 2510, 2511 Código Civil",
      desc: "Posesión irregular de 10 años sin título alguno para adquirir el dominio de bienes.",
      incompatibleWith: ["civ_tradicion_posesion"],
      incompatibilityReasons: {
        civ_tradicion_posesion: "El régimen conservatorio de posesión inscrita prohíbe la prescripción adquisitiva contra título registrado sin previa cancelación (Art. 2505 CC)."
      }
    },
    {
      id: "civ_reivindicatoria",
      name: "Acción Reivindicatoria",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 889, 895 Código Civil",
      desc: "Acción del dueño no poseedor contra el poseedor no dueño para obtener la restitución material de la cosa.",
      incompatibleWith: ["civ_mera_tenencia_arriendo"],
      incompatibilityReasons: {
        civ_mera_tenencia_arriendo: "Contra el mero tenedor procede la acción contractual de restitución o comodato precario, no la reivindicatoria que exige poseedor demandado (Art. 895 CC)."
      }
    },
    {
      id: "civ_mera_tenencia_arriendo",
      name: "Mera Tenencia y Restitución Contractual",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 714, 1915 y ss. Código Civil",
      desc: "Tenencia de una cosa reconociendo dominio ajeno y restitución según la causa contractual.",
      incompatibleWith: ["civ_reivindicatoria"],
      incompatibilityReasons: {
        civ_reivindicatoria: "La mera tenencia no constituye posesión; se ejerce acción contractual de terminación o precario, no reivindicatoria ordinaria."
      }
    },

    // --- DERECHO CIVIL: ACTO JURÍDICO & CONTRATOS ---
    {
      id: "civ_lesion_enorme",
      name: "Lesión Enorme en Compraventa de Inmuebles",
      subject: "civil",
      category: "Acto Jurídico & Contratos",
      rules: "Arts. 1888, 1889, 1890 Código Civil",
      desc: "Desproporción objetiva grave en el justo precio al tiempo del contrato (no procede por plusvalía sobreviniente).",
      incompatibleWith: ["civ_rescision_muebles"],
      incompatibilityReasons: {
        civ_rescision_muebles: "La lesión enorme solo procede en compraventa voluntaria de bienes raíces y partición; no aplica a muebles (Art. 1891 CC)."
      }
    },
    {
      id: "civ_dolo_vicio_consentimiento",
      name: "Dolo como Vicio del Consentimiento (Reticencia)",
      subject: "civil",
      category: "Acto Jurídico & Contratos",
      rules: "Arts. 44 inc. final, 1458 Código Civil",
      desc: "Maquinación fraudulenta de una parte que induce a contratar (dolo determinante y coetáneo al acto).",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_mandato_civil",
      name: "Mandato Civil y Obligación de Medios del Abogado",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 2116, 2118, 2129, 2158 Código Civil",
      desc: "Contrato consensual y oneroso; obligación de medios profesional y responsabilidad por culpa leve.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_clausula_penal_enorme",
      name: "Cláusula Penal Enorme y Reducción al Duplo",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1535, 1544 Código Civil",
      desc: "Límite de orden público económico: en obligaciones de suma determinada la pena no puede exceder el duplo del principal.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_pacto_comisorio_calificado",
      name: "Pacto Comisorio Calificado en la Compraventa",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1877, 1879 Código Civil",
      desc: "Estipulación de resolución por no pago del precio con plazo de 24 horas tras notificación judicial para enervar.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_nulidad_absoluta",
      name: "Nulidad Absoluta por Causa / Objeto Ilícito",
      subject: "civil",
      category: "Acto Jurídico",
      rules: "Arts. 1681, 1682, 1683 Código Civil",
      desc: "Sanción de orden público por infracción de normas prohibitivas o causa/objeto ilícito. Saneable solo por 10 años.",
      incompatibleWith: ["civ_ratificacion_saneamiento_4anos"],
      incompatibilityReasons: {
        civ_ratificacion_saneamiento_4anos: "La nulidad absoluta es de orden público; no se sanea por ratificación ni en el plazo breve de 4 años, requiere 10 años (Art. 1683 CC)."
      }
    },
    {
      id: "civ_ratificacion_saneamiento_4anos",
      name: "Rescisión y Saneamiento (Nulidad Relativa)",
      subject: "civil",
      category: "Acto Jurídico",
      rules: "Arts. 1684, 1691, 1693 Código Civil",
      desc: "Nulidad relativa por vicios del consentimiento o incapacidad relativa, saneable por 4 años o ratificación.",
      incompatibleWith: ["civ_nulidad_absoluta"],
      incompatibilityReasons: {
        civ_nulidad_absoluta: "La rescisión o saneamiento en 4 años solo opera para la nulidad relativa; no aplica a causales de nulidad absoluta."
      }
    },
    {
      id: "civ_resolucion_1489",
      name: "Resolución Contractual (Art. 1489)",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1489, 1873 Código Civil",
      desc: "Condición resolutoria tácita ante incumplimiento en contrato bilateral con indemnización de perjuicios.",
      incompatibleWith: ["civ_cumplimiento_acumulado_resolucion"],
      incompatibilityReasons: {
        civ_cumplimiento_acumulado_resolucion: "El art. 1489 CC consagra remedios principales incompatibles: cumplimiento o resolución, no ambos de forma simultánea."
      }
    },
    {
      id: "civ_cumplimiento_acumulado_resolucion",
      name: "Cumplimiento Forzado Simultáneo a Resolución",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Art. 1489 Código Civil",
      desc: "Pretensión contradictoria de exigir la ejecución forzada y la extinción resolutoria del contrato a la vez.",
      incompatibleWith: ["civ_resolucion_1489"],
      incompatibilityReasons: {
        civ_resolucion_1489: "Dogmáticamente existe incompatibilidad de pretensiones: no es posible solicitar que el contrato se extinga y subsista a la vez."
      }
    },
    {
      id: "civ_excepcion_1552",
      name: "Excepción de Contrato No Cumplido",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Art. 1552 Código Civil ('La mora purga la mora')",
      desc: "Defensa del deudor en contrato bilateral cuando el demandante tampoco ha cumplido ni está llano a cumplir su prestación.",
      incompatibleWith: ["civ_unilateral_mutuo"],
      incompatibilityReasons: {
        civ_unilateral_mutuo: "El art. 1552 CC exige obligaciones correlativas recíprocas (contrato bilateral); es inaplicable a contratos unilaterales."
      }
    },
    {
      id: "civ_unilateral_mutuo",
      name: "Contrato Unilateral (Mutuo / Comodato)",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1439, 2174, 2196 Código Civil",
      desc: "Contrato en que solo una de las partes resulta obligada desde su perfeccionamiento.",
      incompatibleWith: ["civ_excepcion_1552"],
      incompatibilityReasons: {
        civ_excepcion_1552: "En los contratos unilaterales no opera la reciprocidad sinalagmática de la exceptio non adimpleti contractus."
      }
    },
    {
      id: "civ_caso_fortuito",
      name: "Caso Fortuito y Teoría de los Riesgos",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 45, 1547, 1550 Código Civil",
      desc: "Imposibilidad sobreviniente imprevisible e irresistible que extingue la obligación sin culpa del deudor.",
      incompatibleWith: ["civ_culpa_mora_deudor"],
      incompatibilityReasons: {
        civ_culpa_mora_deudor: "El caso fortuito no exime de responsabilidad si el deudor se encontraba en mora culpable o asumió el riesgo (Art. 1547 inc. 2 CC)."
      }
    },
    {
      id: "civ_culpa_mora_deudor",
      name: "Mora Culpable del Deudor",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1551, 1557 Código Civil",
      desc: "Retardo imputable en el cumplimiento de la obligación con constitución en mora.",
      incompatibleWith: ["civ_caso_fortuito"],
      incompatibilityReasons: {
        civ_caso_fortuito: "La mora culpable pone los riesgos a cargo del deudor, impidiéndole invocar el caso fortuito."
      }
    },

    // --- DERECHO CIVIL: RESPONSABILIDAD EXTRACONTRACTUAL ---
    {
      id: "civ_resp_extracontractual",
      name: "Responsabilidad Extracontractual por Culpa",
      subject: "civil",
      category: "Responsabilidad Civil",
      rules: "Arts. 2314, 2329 Código Civil",
      desc: "Estatuto general por hecho ilícito generador de daño patrimonial y moral.",
      incompatibleWith: ["civ_cumulo_responsabilidades"],
      incompatibilityReasons: {
        civ_cumulo_responsabilidades: "Principio de no cúmulo: mediando vínculo contractual previo válido, rige el estatuto contractual y no puede deducirse libremente la vía aquiliana."
      }
    },
    {
      id: "civ_cumulo_responsabilidades",
      name: "Cúmulo Irrestricto de Responsabilidades",
      subject: "civil",
      category: "Responsabilidad Civil",
      rules: "Arts. 1545, 2314 Código Civil",
      desc: "Pretensión improcedente de demandar simultáneamente bajo ambos estatutos por el mismo incumplimiento.",
      incompatibleWith: ["civ_resp_extracontractual"],
      incompatibilityReasons: {
        civ_resp_extracontractual: "El contrato es ley para los contratantes (Art. 1545 CC); pretender eludir los términos contractuales vía extracontractual vulnera el principio de especialidad."
      }
    },
    {
      id: "civ_perdida_chance",
      name: "Pérdida de la Chance / Nexo Causal",
      subject: "civil",
      category: "Responsabilidad Civil",
      rules: "Arts. 2314, 2329 CC, Doctrina Barros Bourie",
      desc: "Frustración de una expectativa legítima de ganancia o curación por conducta negligente: daño cierto e indemnizable.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },

    // --- DERECHO PROCESAL: ORGÁNICO & BASES ---
    {
      id: "proc_imparcialidad_prejuzgamiento",
      name: "Imparcialidad Judicial y Prejuzgamiento",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Art. 19 N° 3 CPR, Arts. 195, 196 N° 10 COT",
      desc: "Garantía de neutralidad del tribunal e implicancia/recusación por emitir opinión previa sobre la litis.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_prorroga_competencia",
      name: "Prórroga de la Competencia Territorial",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 181, 182, 187 Código Orgánico de Tribunales",
      desc: "Acuerdo expreso o tácito para alterar el factor territorio en negocios civiles contenciosos de primera instancia.",
      incompatibleWith: ["proc_competencia_absoluta_fuero", "proc_arbitraje_forzoso"],
      incompatibilityReasons: {
        proc_competencia_absoluta_fuero: "La competencia absoluta (materia, fuero y cuantía) es de orden público irrenunciable y jamás admite prórroga (Art. 182 COT).",
        proc_arbitraje_forzoso: "Las materias de arbitraje forzoso (Art. 227 COT) no admiten prórroga voluntaria ante tribunales ordinarios."
      }
    },
    {
      id: "proc_competencia_absoluta_fuero",
      name: "Incompetencia Absoluta por Fuero / Materia",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 108, 115, 130 COT, Art. 303 N° 1 CPC",
      desc: "Falta de atribución del tribunal por factores de orden público, declarable de oficio en cualquier estado del juicio.",
      incompatibleWith: ["proc_prorroga_competencia"],
      incompatibilityReasons: {
        proc_prorroga_competencia: "Las reglas de competencia absoluta son de orden público; el consentimiento de las partes es ineficaz para prorrogarlas."
      }
    },
    {
      id: "proc_competencia_accion_mueble",
      name: "Competencia en Acciones Personales Muebles",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 580, 581 CC, Art. 138 Código Orgánico de Tribunales",
      desc: "La indemnización por inejecución de obra es acción mueble (Art. 581 CC); a falta de estipulación rige el domicilio del demandado.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_regla_radicacion",
      name: "Regla General de Radicación (Inmodificabilidad)",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 109, 178 Código Orgánico de Tribunales",
      desc: "Radicado el conocimiento de un negocio con arreglo a la ley, no se alterará la competencia por causa sobreviniente (demanda tras prejudicial).",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_mandato_judicial_muerte",
      name: "Mandato Judicial y Muerte del Mandante",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 528, 529 COT, Art. 2163 N° 5 CC",
      desc: "Excepción procesal expresa: el mandato judicial de los abogados NO termina por la muerte del mandante.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_momentos_jurisdiccionales",
      name: "Momentos de la Jurisdicción",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Art. 76 CPR, Art. 1 Código Orgánico de Tribunales",
      desc: "Conocimiento (notio), juzgamiento (iudicium) y ejecución o imperio (executio) de las sentencias judiciales.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },

    // --- DERECHO PROCESAL: JUICIO ORDINARIO, MEDIDAS Y EXCEPCIONES ---
    {
      id: "proc_capacidad_ius_postulandi",
      name: "Capacidad Procesal e Ius Postulandi",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 1 y 2 Ley 18.120, Arts. 6 y ss. CPC",
      desc: "Requisitos de patrocinio por abogado habilitado y mandato judicial idóneo para comparecer en juicio.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_excepcion_dilatoria_incompetencia",
      name: "Excepción Dilatoria de Incompetencia",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 303 N° 1, 305 Código de Procedimiento Civil",
      desc: "Defensa previa antes de contestar la demanda que reclama la falta de competencia del juez.",
      incompatibleWith: ["proc_contestacion_sin_reserva"],
      incompatibilityReasons: {
        proc_contestacion_sin_reserva: "Si el demandado contesta el fondo de la demanda sin oponer la excepción de incompetencia relativa, se produce la prórroga tácita (Art. 187 N° 2 COT)."
      }
    },
    {
      id: "proc_contestacion_sin_reserva",
      name: "Contestación al Fondo sin Reclamar Incompetencia",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Art. 187 N° 2 COT, Art. 309 CPC",
      desc: "Acto de defensa de fondo que convalida el territorio y prorroga tácitamente la competencia.",
      incompatibleWith: ["proc_excepcion_dilatoria_incompetencia"],
      incompatibilityReasons: {
        proc_excepcion_dilatoria_incompetencia: "Al contestar al fondo sin formular reserva ni deducir excepción dilatoria previa, opera de pleno derecho la prórroga tácita."
      }
    },
    {
      id: "proc_medidas_precautorias",
      name: "Medidas Prejudiciales Precautorias y Proporcionalidad",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 279, 289, 290, 298 Código de Procedimiento Civil",
      desc: "Aseguramiento del resultado del juicio; requisito de proporcionalidad estricta entre el monto demandado y el bien gravado.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_transaccion_metodos",
      name: "Transacción Extrajudicial y Excepción Mixta",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 2446, 2460 CC, Arts. 304, 310 CPC",
      desc: "Contrato autocompositivo bilateral con efecto de cosa juzgada; oponible como excepción mixta, perentoria o anómala.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_juicio_ejecutivo_excepciones",
      name: "Excepciones en Juicio Ejecutivo (Art. 464 N° 7)",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 434, 464 N° 7 Código de Procedimiento Civil",
      desc: "Falta de fuerza ejecutiva del título respecto del exceso o iliquidez de la deuda demandada.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_recurso_apelacion",
      name: "Recurso de Apelación en Sentencia Definitiva",
      subject: "procesal",
      category: "Recursos Procesales",
      rules: "Arts. 186, 189, 194 Código de Procedimiento Civil",
      desc: "Recurso ordinario que persigue la enmienda conforme a derecho de resolución agraviante.",
      incompatibleWith: ["proc_reposicion_ordinaria_definitiva"],
      incompatibilityReasons: {
        proc_reposicion_ordinaria_definitiva: "El recurso de reposición ordinario es legalmente improcedente contra sentencias definitivas (Art. 181 CPC)."
      }
    },
    {
      id: "proc_reposicion_ordinaria_definitiva",
      name: "Reposición Ordinaria contra Definitiva",
      subject: "procesal",
      category: "Recursos Procesales",
      rules: "Art. 181 Código de Procedimiento Civil",
      desc: "Error técnico consistente en deducir reposición ordinaria contra sentencia definitiva (desasimiento del tribunal).",
      incompatibleWith: ["proc_recurso_apelacion"],
      incompatibilityReasons: {
        proc_recurso_apelacion: "Las sentencias definitivas causan desasimiento del tribunal (Art. 182 CPC); no pueden ser revocadas por reposición ordinaria."
      }
    },

    // --- DERECHO CONSTITUCIONAL ---
    {
      id: "const_recurso_proteccion",
      name: "Recurso de Protección y Proscripción de Autotutela",
      subject: "constitucional",
      category: "Garantías Constitucionales",
      rules: "Arts. 19 N° 3 inc. 5, 19 N° 24, Art. 20 CPR",
      desc: "Acción cautelar de urgencia frente a vías de hecho o actos arbitrarios que vulneran el derecho de propiedad y debido proceso.",
      incompatibleWith: ["const_derechos_litigiosos_dudosos"],
      incompatibilityReasons: {
        const_derechos_litigiosos_dudosos: "El recurso de protección es de urgencia y exige derecho indubitado; es improcedente para declarar derechos contractuales litigiosos de lato conocimiento."
      }
    },
    {
      id: "const_derechos_litigiosos_dudosos",
      name: "Protección sobre Derechos Contractuales Litigiosos",
      subject: "constitucional",
      category: "Garantías Constitucionales",
      rules: "Art. 20 CPR, Jurisprudencia Corte Suprema",
      desc: "Pretensión improcedente de utilizar la vía de protección como sustituto del juicio ordinario civil de cobro o resolución.",
      incompatibleWith: ["const_recurso_proteccion"],
      incompatibilityReasons: {
        const_recurso_proteccion: "Jurisprudencia uniforme de la Corte Suprema declara inadmisible el recurso de protección cuando el conflicto versa sobre derechos controvertidos nacidos de un contrato."
      }
    }
  ],

  // 2. PRESETS PARA MODO TÓPICO GENERAL / CASO SORPRESA DE GRADO
  TOPIC_PRESETS: [
    {
      id: "preset_examen_aleatorio",
      title: "🎲 Simulación Real de Examen de Grado (Aleatorio)",
      tagline: "El algoritmo selecciona instituciones interdisciplinarias armónicas de Civil y Procesal.",
      subjects: ["civil", "procesal"],
      institutions: ["civ_tradicion_posesion", "civ_resolucion_1489", "proc_prorroga_competencia"]
    },
    {
      id: "preset_lesion_dolo_mandato",
      title: "🏛️ Caso Evaluación Diagnóstica AFG: Lesión Enorme & Dolo",
      tagline: "Justo precio en compraventa de inmuebles, dolo reticente y obligaciones profesionales del abogado.",
      subjects: ["civil"],
      institutions: ["civ_lesion_enorme", "civ_dolo_vicio_consentimiento", "civ_mandato_civil"]
    },
    {
      id: "preset_cautelares_radicacion",
      title: "🛡️ Caso Evaluación Diagnóstica AFG: Medidas Cautelares & Competencia",
      tagline: "Acción mueble, medidas prejudiciales desproporcionadas, regla de radicación y mandato judicial.",
      subjects: ["procesal"],
      institutions: ["proc_medidas_precautorias", "proc_competencia_accion_mueble", "proc_regla_radicacion", "proc_mandato_judicial_muerte"]
    },
    {
      id: "preset_clausula_penal_ejecutivo",
      title: "📉 Cláusula Penal Enorme & Juicio Ejecutivo",
      tagline: "Confección de obra, límite de la pena al duplo (Art. 1544 CC) y excepción del Art. 464 N° 7 CPC.",
      subjects: ["civil", "procesal"],
      institutions: ["civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones"]
    },
    {
      id: "preset_responsabilidad_medica",
      title: "🏥 Responsabilidad Médica, Pérdida de la Chance & Solidaridad",
      tagline: "Falla diagnóstica contra la lex artis, certeza del daño probabilístico y responsabilidad por dependientes.",
      subjects: ["civil"],
      institutions: ["civ_resp_extracontractual", "civ_perdida_chance"]
    },
    {
      id: "preset_transaccion_metodos",
      title: "🤝 Taller Procesal: Transacción Extrajudicial & Excepciones",
      tagline: "Contrato autocompositivo bilateral, cosa juzgada y articulación como excepción dilatoria mixta o anómala.",
      subjects: ["procesal", "civil"],
      institutions: ["proc_transaccion_metodos", "civ_resolucion_1489"]
    },
    {
      id: "preset_imparcialidad_momentos",
      title: "⚖️ Taller Procesal: Imparcialidad Judicial & Momentos de la Jurisdicción",
      tagline: "Prejuzgamiento en audiencia de conciliación, causal de recusación y prórroga tácita de competencia.",
      subjects: ["procesal"],
      institutions: ["proc_imparcialidad_prejuzgamiento", "proc_momentos_jurisdiccionales", "proc_prorroga_competencia"]
    },
    {
      id: "preset_resolucion_pacto_comisorio",
      title: "📑 Resolución Contractual & Pacto Comisorio Calificado",
      tagline: "Sinalagma contractual, mora purga la mora (Art. 1552 CC) y plazo fatal de 24 horas del Art. 1879 CC.",
      subjects: ["civil"],
      institutions: ["civ_resolucion_1489", "civ_excepcion_1552", "civ_pacto_comisorio_calificado"]
    },
    {
      id: "preset_nulidad_simulacion",
      title: "🔍 Nulidad Absoluta por Causa Ilícita & Simulación",
      tagline: "Enajenación fraudulenta, legitimación activa de acreedores y efectos contra terceros poseedores.",
      subjects: ["civil"],
      institutions: ["civ_nulidad_absoluta", "civ_ratificacion_saneamiento_4anos"]
    },
    {
      id: "preset_proteccion_propiedad",
      title: "📜 Recurso de Protección: Autotutela vs Vía Contractual",
      tagline: "Corte arbitrario de suministros, derecho de propiedad y delimitación frente a juicios declarativos.",
      subjects: ["constitucional"],
      institutions: ["const_recurso_proteccion", "const_derechos_litigiosos_dudosos"]
    }
  ],

  // 3. BANCO DE VARIABLES ALEATORIAS PARA EL MUTADOR DE CASOS (GARANTÍA CERO REPETICIÓN)
  MUTATOR_DATA: {
    partiesA: [
      { name: "MATÍAS HORMAZÁBAL", desc: "empresario agrícola" },
      { name: "ROBERTO VIAL", desc: "inversionista particular" },
      { name: "FERNANDO CASAS", desc: "comerciante del rubro maderero" },
      { name: "BERNARDO SALGADO", desc: "propietario particular" },
      { name: "IGNACIO BULNES", desc: "constructor independiente" },
      { name: "SEBASTIÁN GAETE", desc: "ingeniero civil y contratista" },
      { name: "PATRICIO SOTO", desc: "pequeño agricultor vitivinícola" },
      { name: "CLAUDIO FUENZALIDA", desc: "empresario del transporte" }
    ],
    partiesB: [
      { name: "INMOBILIARIA BUENOS AIRES SPA", desc: "empresa de desarrollo urbano" },
      { name: "CONSTRUCTORA E INMOBILIARIA HORIZONTE LTDA.", desc: "empresa de edificación habitacional" },
      { name: "CONSTRUCTORA BOSQUES VERDES S.A.", desc: "empresa de obras civiles" },
      { name: "SERVICIOS MÉDICOS Y QUIRÚRGICOS DEL SUR S.A.", desc: "entidad hospitalaria privada" },
      { name: "COMERCIALIZADORA AGRÍCOLA LOS RÍOS SPA", desc: "empresa agroindustrial" },
      { name: "TRANSPORTES INTERANDINOS S.A.", desc: "empresa de logística y carga" },
      { name: "DESARROLLOS COMERCIALES DEL VALLE LTDA.", desc: "empresa de proyectos comerciales" }
    ],
    thirdParties: [
      { name: "CAMILA EYZAGUIRRE", desc: "segunda adquirente con título inscrito" },
      { name: "VALENTINA ARRAU", desc: "compradora de buena fe inscrita" },
      { name: "MARÍA JOSÉ OSSA", desc: "adquirente particular del predio" },
      { name: "ANDRÉS SCHMIDT", desc: "tercer poseedor del bien" },
      { name: "CAROLINA VALDÉS", desc: "cesionaria de los derechos registrales" }
    ],
    attorneys: [
      { name: "abogado ERNESTO VALLADARES", desc: "abogado habilitado para el ejercicio" },
      { name: "abogado RODRIGO PEÑALOZA", desc: "abogado litigante con patente al día" },
      { name: "abogado CRISTIÁN ALDUNATE", desc: "abogado patrocinante de la parte actora" },
      { name: "abogada MARCELA LARRAÍN", desc: "abogada mandataria de la parte demandada" }
    ],
    locations: [
      { city: "Santiago", court: "2° Juzgado de Letras en lo Civil de Santiago", comm: "Quilicura" },
      { city: "Viña del Mar", court: "1° Juzgado Civil de Viña del Mar", comm: "Casablanca" },
      { city: "Concepción", court: "3° Juzgado de Letras en lo Civil de Concepción", comm: "San Pedro de la Paz" },
      { city: "Temuco", court: "2° Juzgado de Letras en lo Civil de Temuco", comm: "Pucón" },
      { city: "Antofagasta", court: "1° Juzgado de Letras de Antofagasta", comm: "Mejillones" },
      { city: "Rancagua", court: "2° Juzgado de Letras de Rancagua", comm: "Machalí" },
      { city: "Talca", court: "1° Juzgado de Letras de Talca", comm: "San Clemente" },
      { city: "Valdivia", court: "2° Juzgado Civil de Valdivia", comm: "Panguipulli" },
      { city: "La Serena", court: "1° Juzgado de Letras de La Serena", comm: "Coquimbo" }
    ],
    amounts: [
      { clp: "$120.000.000", uf: "7.000 UF", partial: "$40.000.000", excess: "$200.000.000", penaltyDaily: "$10.000.000", totalPenalty: "$600.000.000", baseContract: "$500.000.000" },
      { clp: "$180.000.000", uf: "9.500 UF", partial: "$60.000.000", excess: "$280.000.000", penaltyDaily: "$15.000.000", totalPenalty: "$750.000.000", baseContract: "$600.000.000" },
      { clp: "$95.000.000", uf: "5.500 UF", partial: "$31.600.000", excess: "$160.000.000", penaltyDaily: "$8.000.000", totalPenalty: "$480.000.000", baseContract: "$400.000.000" },
      { clp: "$250.000.000", uf: "12.000 UF", partial: "$83.300.000", excess: "$380.000.000", penaltyDaily: "$20.000.000", totalPenalty: "$900.000.000", baseContract: "$700.000.000" }
    ],
    dates: [
      { contract: "12 de marzo de 2023", breach: "15 de mayo de 2023", lawsuit: "20 de julio de 2023", hearing: "18 de noviembre de 2023" },
      { contract: "18 de abril de 2024", breach: "10 de junio de 2024", lawsuit: "22 de agosto de 2024", hearing: "30 de noviembre de 2024" },
      { contract: "5 de enero de 2023", breach: "28 de febrero de 2023", lawsuit: "14 de abril de 2023", hearing: "5 de octubre de 2023" },
      { contract: "14 de julio de 2023", breach: "30 de septiembre de 2023", lawsuit: "12 de diciembre de 2023", hearing: "24 de abril de 2024" }
    ]
  },

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  shuffleQuestionOptions(q) {
    const originalCorrectText = q.options.find(o => o.id.toLowerCase() === q.correctAnswer.toLowerCase())?.text;
    
    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const letters = ["a", "b", "c", "d", "e"];
    let newCorrectLetter = "a";

    const newOptions = shuffled.map((opt, idx) => {
      const letter = letters[idx] || "a";
      if (opt.text === originalCorrectText) {
        newCorrectLetter = letter;
      }
      return {
        id: letter,
        text: opt.text
      };
    });

    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrectLetter
    };
  },

  openModal() {
    this.selectedInstitutions.clear();
    this.activeMode = "manual";
    this.selectedPresetId = null;
    this.renderModal();
  },

  closeModal() {
    const modal = document.getElementById("ai-case-generator-modal");
    if (modal) {
      if (typeof modal.remove === "function") {
        modal.remove();
      } else if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }
  },

  getIncompatibilitiesFor(instId) {
    const inst = this.INSTITUTIONS.find(i => i.id === instId);
    if (!inst) return [];
    return inst.incompatibleWith || [];
  },

  getIncompatibility(instId) {
    const inst = this.INSTITUTIONS.find(i => i.id === instId);
    if (!inst) return null;

    for (const selId of this.selectedInstitutions) {
      if (selId === instId) continue;
      const selInst = this.INSTITUTIONS.find(i => i.id === selId);
      if (!selInst) continue;

      if (inst.incompatibleWith && inst.incompatibleWith.includes(selId)) {
        return {
          culpritId: selId,
          culpritName: selInst.name,
          reason: inst.incompatibilityReasons?.[selId] || `Dogmáticamente incompatible con ${selInst.name}.`
        };
      }
      if (selInst.incompatibleWith && selInst.incompatibleWith.includes(instId)) {
        return {
          culpritId: selId,
          culpritName: selInst.name,
          reason: selInst.incompatibilityReasons?.[instId] || `Dogmáticamente incompatible con ${selInst.name}.`
        };
      }
    }
    return null;
  },

  toggleInstitution(instId) {
    if (this.selectedInstitutions.has(instId)) {
      this.selectedInstitutions.delete(instId);
      this.updatePillsUI();
      return;
    }

    // Si existe una institución previamente seleccionada que sea incompatible,
    // se descarta automáticamente la incompatible para admitir la nueva selección
    const incomp = this.getIncompatibility(instId);
    if (incomp && incomp.culpritId) {
      this.selectedInstitutions.delete(incomp.culpritId);
      if (typeof App !== "undefined" && App.showToast) {
        App.showToast(`Se descartó automáticamente "${incomp.culpritName}" por incompatibilidad dogmática`, "info");
      }
    }

    if (this.selectedInstitutions.size >= 4) {
      if (typeof App !== "undefined" && App.showToast) {
        App.showToast("Has alcanzado el límite óptimo de 4 instituciones para mantener el realismo de examen", "warning");
      }
      return;
    }

    this.selectedInstitutions.add(instId);
    this.updatePillsUI();
  },

  updatePillsUI() {
    if (typeof document === "undefined") return;
    const modal = document.getElementById("ai-case-generator-modal");
    if (!modal) return;

    this.INSTITUTIONS.forEach(inst => {
      const btn = modal.querySelector(`[data-inst-id="${inst.id}"]`);
      if (!btn) return;

      const isSelected = this.selectedInstitutions.has(inst.id);
      const incomp = !isSelected ? this.getIncompatibility(inst.id) : null;

      btn.classList.toggle("selected", isSelected);
      btn.classList.toggle("disabled-incompatible", Boolean(incomp));

      const badgeEl = btn.querySelector(".inst-incomp-badge");
      if (badgeEl) {
        if (incomp) {
          badgeEl.textContent = `⚠️ Incompatible con ${incomp.culpritName}`;
          badgeEl.style.display = "inline-block";
          btn.title = incomp.reason;
        } else {
          badgeEl.style.display = "none";
          btn.title = inst.desc;
        }
      }
    });

    const count = this.selectedInstitutions.size;
    const counterEl = modal.querySelector("#inst-selection-counter");
    if (counterEl) {
      counterEl.textContent = `${count} / 4 seleccionadas`;
      counterEl.className = `inst-selection-badge ${count >= 1 ? 'ready' : ''}`;
    }

    const btnGenerate = modal.querySelector("#btn-do-generate-case");
    if (btnGenerate) {
      btnGenerate.disabled = false;
    }
  },

  applyPreset(presetId) {
    const preset = this.TOPIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.selectedPresetId = presetId;
    this.selectedInstitutions.clear();
    preset.institutions.forEach(id => this.selectedInstitutions.add(id));

    const modal = document.getElementById("ai-case-generator-modal");
    if (modal) {
      modal.querySelectorAll(".preset-card").forEach(c => {
        c.classList.toggle("active", c.dataset.presetId === presetId);
      });
      const btnGenerate = modal.querySelector("#btn-do-generate-case");
      if (btnGenerate) btnGenerate.disabled = false;
    }
  },

  renderModal() {
    this.closeModal();

    const modalEl = document.createElement("div");
    modalEl.id = "ai-case-generator-modal";
    modalEl.className = "ai-gen-modal-overlay";

    const civilInsts = this.INSTITUTIONS.filter(i => i.subject === "civil");
    const procInsts = this.INSTITUTIONS.filter(i => i.subject === "procesal");
    const constInsts = this.INSTITUTIONS.filter(i => i.subject === "constitucional");

    modalEl.innerHTML = `
      <div class="ai-gen-modal-container">
        
        <!-- HEADER -->
        <div class="ai-gen-header">
          <div class="ai-gen-header-title">
            <div class="ai-gen-badge-sparkle">
              <i data-lucide="sparkles"></i>
            </div>
            <div>
              <h2>Generador Metodológico de Casos con IA</h2>
              <p>Creación de casos de nivel examen de grado ajustados al Protocolo 2026-20 y Rúbrica de 4 Dimensiones</p>
            </div>
          </div>
          <button id="btn-close-ai-gen" class="icon-btn" title="Cerrar modal">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- BANNER DE NUTRICIÓN DOGMÁTICA Y FUENTES -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 12px 24px 0 24px; padding: 8px 14px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-secondary);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="shield-check" style="width: 15px; height: 15px; color: #60a5fa;"></i>
            <span>Agente nutrido con la carpeta <strong>FUENTES</strong> y los <strong>Apuntes Oficiales (53 Cédulas)</strong></span>
          </div>
          <span style="color: #60a5fa; font-weight: 600; font-size: 0.75rem;">Protocolo AFG 2026-20</span>
        </div>

        <!-- PESTAÑAS DE MODO -->
        <div class="ai-gen-mode-tabs">
          <button class="ai-gen-tab-btn ${this.activeMode === 'manual' ? 'active' : ''}" data-tab-mode="manual">
            <i data-lucide="check-square"></i>
            <span>1. Selección por Instituciones Jurídicas</span>
          </button>
          <button class="ai-gen-tab-btn ${this.activeMode === 'preset' ? 'active' : ''}" data-tab-mode="preset">
            <i data-lucide="dices"></i>
            <span>2. Tópico General / Simulación Sorpresa</span>
          </button>
        </div>

        <!-- CUERPO -->
        <div class="ai-gen-body">
          
          <!-- MODO 1: SELECCIÓN MANUAL DE INSTITUCIONES -->
          <div id="ai-gen-view-manual" style="display: ${this.activeMode === 'manual' ? 'block' : 'none'};">
            
            <div class="ai-gen-helper-banner">
              <i data-lucide="info" style="color: var(--gold-primary); min-width: 18px;"></i>
              <div>
                <strong>Reglas de Armonía Dogmática:</strong> Selecciona entre <strong>1 y 4 instituciones</strong> para estructurar el conflicto. El motor descartará y bloqueará automáticamente cualquier institución incompatible con tus selecciones.
              </div>
              <div id="inst-selection-counter" class="inst-selection-badge">
                0 / 4 seleccionadas
              </div>
            </div>

            <!-- GRUPO CIVIL -->
            <div class="inst-category-section">
              <h3 class="inst-category-title civil">
                <i data-lucide="book-open"></i> Derecho Civil (Acto Jurídico, Bienes, Contratos y Responsabilidad)
              </h3>
              <div class="inst-pills-grid">
                ${civilInsts.map(inst => this.renderInstPill(inst)).join('')}
              </div>
            </div>

            <!-- GRUPO PROCESAL -->
            <div class="inst-category-section">
              <h3 class="inst-category-title procesal">
                <i data-lucide="scale"></i> Derecho Procesal (Orgánico, Juicio Ordinario, Medidas y Recursos)
              </h3>
              <div class="inst-pills-grid">
                ${procInsts.map(inst => this.renderInstPill(inst)).join('')}
              </div>
            </div>

            <!-- GRUPO CONSTITUCIONAL -->
            <div class="inst-category-section">
              <h3 class="inst-category-title constitucional">
                <i data-lucide="shield"></i> Derecho Constitucional & Garantías
              </h3>
              <div class="inst-pills-grid">
                ${constInsts.map(inst => this.renderInstPill(inst)).join('')}
              </div>
            </div>

          </div>

          <!-- MODO 2: PRESETS DE TÓPICOS GENERALES / CASO SORPRESA -->
          <div id="ai-gen-view-preset" style="display: ${this.activeMode === 'preset' ? 'block' : 'none'};">
            
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">
              Ideal para estudiantes que desean simular la incertidumbre del examen de grado sin elegir instituciones previas. Haz clic en un tópico para preparar el caso:
            </p>

            <div class="presets-grid">
              ${this.TOPIC_PRESETS.map(preset => `
                <div class="preset-card ${this.selectedPresetId === preset.id ? 'active' : ''}" data-preset-id="${preset.id}">
                  <div class="preset-card-title">${preset.title}</div>
                  <div class="preset-card-tagline">${preset.tagline}</div>
                  <div class="preset-card-insts">
                    ${preset.institutions.map(id => {
                      const inst = this.INSTITUTIONS.find(i => i.id === id);
                      return `<span class="preset-inst-tag">${inst ? inst.name : id}</span>`;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>

          </div>

        </div>

        <!-- FOOTER Y BOTONES DE ACCIÓN -->
        <div class="ai-gen-footer">
          <div class="ai-gen-footer-options">
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              Preguntas generadas: <strong>3 de alternativas (A-E)</strong> con justificación oficial y pauta de hechos.
            </span>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btn-cancel-ai-gen" class="btn btn-secondary">
              Cancelar
            </button>
            <button id="btn-do-generate-case" class="btn btn-primary">
              <i data-lucide="sparkles"></i>
              <span>Generar Caso Práctico & Rúbricas</span>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modalEl);
    if (window.lucide) window.lucide.createIcons();
    this.bindModalEvents(modalEl);
  },

  renderInstPill(inst) {
    return `
      <div class="inst-pill" data-inst-id="${inst.id}" title="${inst.desc}">
        <div class="inst-pill-header">
          <span class="inst-pill-name">${inst.name}</span>
          <span class="inst-pill-rules">${inst.rules}</span>
        </div>
        <div class="inst-incomp-badge" style="display: none;"></div>
      </div>
    `;
  },

  bindModalEvents(modalEl) {
    modalEl.querySelector("#btn-close-ai-gen")?.addEventListener("click", () => this.closeModal());
    modalEl.querySelector("#btn-cancel-ai-gen")?.addEventListener("click", () => this.closeModal());
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) this.closeModal();
    });

    modalEl.querySelectorAll("[data-tab-mode]").forEach(tab => {
      tab.addEventListener("click", () => {
        const mode = tab.dataset.tabMode;
        this.activeMode = mode;
        modalEl.querySelectorAll("[data-tab-mode]").forEach(t => t.classList.toggle("active", t === tab));
        modalEl.querySelector("#ai-gen-view-manual").style.display = mode === "manual" ? "block" : "none";
        modalEl.querySelector("#ai-gen-view-preset").style.display = mode === "preset" ? "block" : "none";
        this.updatePillsUI();
      });
    });

    modalEl.querySelectorAll(".inst-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const id = pill.dataset.instId;
        this.toggleInstitution(id);
      });
    });

    modalEl.querySelectorAll(".preset-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.presetId;
        this.applyPreset(id);
      });
    });

    const btnGenerate = modalEl.querySelector("#btn-do-generate-case");
    if (btnGenerate) {
      btnGenerate.addEventListener("click", () => {
        this.executeGeneration();
      });
    }
  },

  /**
   * Ejecuta el proceso de generación con feedback animado y lo guarda en el banco de casos
   */
  async executeGeneration() {
    if (this.selectedInstitutions.size === 0) {
      if (this.activeMode === "preset" && this.selectedPresetId) {
        this.applyPreset(this.selectedPresetId);
      } else {
        this.applyPreset("preset_examen_aleatorio");
        if (typeof App !== "undefined" && App.showToast) {
          App.showToast("Iniciando simulación aleatoria de Examen de Grado...", "info");
        }
      }
    }

    const modal = document.getElementById("ai-case-generator-modal");
    if (!modal) return;

    const selectedList = Array.from(this.selectedInstitutions)
      .map(id => this.INSTITUTIONS.find(i => i.id === id))
      .filter(Boolean);

    modal.querySelector(".ai-gen-body").innerHTML = `
      <div class="generator-loading-state">
        <div class="loading-spinner"></div>
        <h3 style="font-family: var(--font-display); color: var(--gold-primary); margin-top: 18px;">
          El Agente de IA está redactando el caso de examen de grado...
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 500px; text-align: center; line-height: 1.6;">
          Estructurando hechos circunstanciados según la Pauta 2026, preguntas de alternativas A-E con barajado dinámico y rúbricas oficiales de 4 dimensiones.
        </p>
        <div class="loading-quote">
          <em>"La premisa mayor es la regla positiva; la premisa menor, el hecho comprobado; la conclusión, la solución dogmática irrevocable."</em>
        </div>
      </div>
    `;

    const btnFooter = modal.querySelector(".ai-gen-footer");
    if (btnFooter) btnFooter.style.display = "none";

    setTimeout(async () => {
      const newCase = this.synthesizeCase(selectedList);

      // 1. Guardar en StorageService local aplicando límite FIFO de 10 casos de práctica
      const data = StorageService.getData();
      if (!data.cases) data.cases = [];
      data.cases.unshift(newCase);
      StorageService.saveData(data);
      StorageService.pruneOldAiCases(10);

      // 2. Persistir en servidor físico y sincronizar retención de disco
      try {
        const res = await fetch("/api/ai/save-generated-case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCase)
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.prunedCount > 0) {
            console.log(`[Storage] Retención FIFO activa: ${resData.prunedCount} caso(s) antiguo(s) purgado(s) del servidor.`);
          }
        }
      } catch (err) {
        console.warn("Aviso: No se pudo guardar en disco servidor, conservado en local:", err);
      }

      this.closeModal();

      // 3. Configurar CaseSolver para mostrar de inmediato el nuevo caso sin filtros excluyentes
      if (typeof CaseSolver !== "undefined") {
        CaseSolver.activeFilter = "all";
        CaseSolver.searchTerm = "";
        CaseSolver.currentCaseId = newCase.id;
        CaseSolver.currentQuestionIndex = 0;
        CaseSolver.mobileView = "workbench";
      }

      // 4. Conmutar a la vista de casos si no estamos en ella
      if (typeof App !== "undefined" && typeof App.switchView === "function") {
        App.switchView("cases");
      }

      if (typeof CaseSolver !== "undefined" && typeof CaseSolver.render === "function") {
        CaseSolver.render();
      }

      if (typeof App !== "undefined" && App.showToast) {
        App.showToast(`¡Caso "${newCase.title.slice(0, 38)}..." generado exitosamente!`, "success");
      }
    }, 1200);
  },

  /**
   * SINTETIZADOR JURÍDICO DE ALTA FIDELIDAD:
   * Evalúa la afinidad dogmática de las instituciones seleccionadas, selecciona el arquetipo óptimo,
   * muta las variables fácticas (para garantizar cero repetición) y baraja las alternativas de cada pregunta.
   */
  synthesizeCase(selectedInstitutions) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
    const instIds = selectedInstitutions.map(i => i.id);

    // Muestreo dinámico de variables fácticas (Mutador)
    const partyA = this.pickRandom(this.MUTATOR_DATA.partiesA);
    const partyB = this.pickRandom(this.MUTATOR_DATA.partiesB);
    const thirdParty = this.pickRandom(this.MUTATOR_DATA.thirdParties);
    const attorney = this.pickRandom(this.MUTATOR_DATA.attorneys);
    const loc = this.pickRandom(this.MUTATOR_DATA.locations);
    const amt = this.pickRandom(this.MUTATOR_DATA.amounts);
    const dates = this.pickRandom(this.MUTATOR_DATA.dates);

    // DEFINICIÓN DE LOS 10 ARQUETIPOS DE EXAMEN DE GRADO
    const archetypes = [
      // ARQUETIPO 1: BIENES, POSESIÓN REGISTRAL Y DOBLE VENTA INMOBILIARIA
      {
        id: "bienes_posesion_doble_venta",
        subjects: ["civil"],
        targetInsts: ["civ_tradicion_posesion", "civ_reivindicatoria", "civ_mera_tenencia_arriendo"],
        linkedFuentes: { file: "derecho_de_bienes.md", section: "La Posesión y Modos de Adquirir", rules: "Arts. 686, 700, 724, 728, 1817 CC" },
        linkedTopics: [{ id: "civil-los -1-3", code: "1.3", title: "El Modo de Adquirir Tradición (Arts. 670 y ss. CC)" }, { id: "civil-los -1-4", code: "1.4", title: "La Posesión y la Teoría de la Posesión Inscrita" }, { id: "civil-los -1-6", code: "1.6", title: "Protección del Dominio y de la Posesión (Acción Reivindicatoria)" }],
        dogmaticPrinciples: "La inscripción conservatoria es requisito, prueba y garantía de la posesión sobre inmuebles (Arts. 686 y 724 CC). La entrega material no transfiere el dominio ni desvirtúa la preferencia del Art. 1817 CC.",
        build: () => {
          const title = `Caso Práctico: Compraventa de Inmueble, Posesión Registral y Acción Reivindicatoria (${partyA.name} c/ ${partyB.name})`;
          const facts = `Con fecha ${dates.contract}, ${partyA.name} celebró por escritura pública ante Notario de ${loc.city} un contrato de compraventa con ${partyB.name}, respecto del inmueble ubicado en la comuna de ${loc.comm}, por un precio total de ${amt.clp}, pagadero en tres cuotas iguales de ${amt.partial}.\n\n` +
            `En la misma fecha, ${partyB.name} efectuó la entrega material del predio a ${partyA.name}, pero este último omitió requerir de inmediato la inscripción en el Conservador de Bienes Raíces respectivo. Dos meses después, el día ${dates.breach}, ${partyB.name} vendió nuevamente el mismo inmueble a ${thirdParty.name}, por escritura pública que fue competentemente inscrita en el Registro de Propiedad del Conservador de Bienes Raíces el día 25 del mismo mes.\n\n` +
            `Al enterarse de la inscripción, ${partyA.name} suspendió el pago de la segunda cuota. Ante ello, ${partyB.name} dedujo demanda ordinaria de cumplimiento forzado con indemnización de perjuicios ante el ${loc.court}. ${partyA.name} compareció oponiendo la excepción de contrato no cumplido (Art. 1552 CC) y dedujo demanda reconvencional reivindicatoria contra ${thirdParty.name}, alegando ser el dueño exclusivo por haber adquirido con anterioridad mediante entrega material.`;
          
          const breakdown = {
            principales: [
              `Compraventa por escritura pública entre ${partyA.name} y ${partyB.name} sobre inmueble en ${loc.comm} con entrega material sin inscripción registral.`,
              `Segunda venta del mismo inmueble por ${partyB.name} a ${thirdParty.name} con competente inscripción en el Registro de Propiedad del Conservador.`,
              `Falta de pago de la segunda cuota de ${amt.partial} por ${partyA.name} al constatar la inscripción de un tercero.`,
              `Demanda de cumplimiento deducida ante el ${loc.court} y reconvención reivindicatoria contra el poseedor inscrito.`
            ],
            secundarios: [
              `Domicilio de las partes en ${loc.city} y desglose del pago en cuotas.`,
              `Mención a la buena o mala fe subjetiva de los compradores al momento de la suscripción.`
            ],
            distractores: [
              "La entrega material efectuada al primer comprador (en Chile la tradición del dominio sobre bienes raíces solo se efectúa por la inscripción conservatoria, Arts. 686 y 724 CC).",
              "La alegación de que la segunda compraventa es nula por venta de cosa ajena (en el derecho chileno la venta de cosa ajena es válida y eficaz entre las partes, Art. 1815 CC)."
            ],
            partes: {
              principales: `${partyA.name} (Primer comprador con entrega material / Reconviniente), ${partyB.name} (Vendedor demandante principal) y ${thirdParty.name} (Segunda compradora con título inscrito).`,
              secundarias: `Juez titular del ${loc.court}, Notario de ${loc.city} y Conservador de Bienes Raíces.`
            },
            instituciones: [
              "Teoría de la Posesión Inscrita y Tradición de Inmuebles (Arts. 686, 724 y 728 CC)",
              "Doble venta de una misma cosa a distintas personas (Art. 1817 CC)",
              "Acción Reivindicatoria y requisitos de titularidad (Arts. 889 y 895 CC)",
              "Excepción de Contrato No Cumplido (Art. 1552 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Bienes y Tradición)",
              questionText: `Frente a la concurrencia de la entrega material en favor de ${partyA.name} y la posterior inscripción en favor de ${thirdParty.name}, ¿quién ostenta la calidad jurídica de dueño del inmueble?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `${thirdParty.name}, pues sobre los bienes raíces la tradición del dominio y la posesión inscrita solo se perfeccionan mediante la competente inscripción en el Registro del Conservador de Bienes Raíces (Arts. 686 y 724 CC).` },
                { id: "b", text: `${partyA.name}, porque la entrega material previa le confirió posesión regular y el dominio indiscutible por principio de prelación cronológica contractual.` },
                { id: "c", text: `Ambas partes adquieren una comunidad hereditaria o cuasicontractual sobre el inmueble hasta que un juez árbitro liquide la propiedad.` },
                { id: "d", text: `Ninguno de los dos, puesto que la doble venta acarrea la nulidad absoluta e inexistencia de ambos contratos de pleno derecho.` },
                { id: "e", text: `${partyB.name} conserva el dominio fiduciario mientras no se dicte sentencia firme en el juicio ordinario de mayor cuantía.` }
              ],
              explanation: "En el derecho civil chileno rige el principio dual de título y modo. Tratándose de bienes raíces, la tradición del dominio y demás derechos reales sobre inmuebles se efectúa única y exclusivamente por la inscripción del título en el Registro de Propiedad del Conservador de Bienes Raíces (Art. 686 CC). La mera entrega material no transfiere el dominio ni confiere posesión regular inscrita (Arts. 724 y 728 CC). Además, el Art. 1817 CC dispone expresamente que vendida una cosa a dos personas, es preferido el comprador a quien se ha hecho la tradición formal.",
              officialRubric: {
                criterio1Marco: { name: "Identificación del marco jurídico pertinente", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la tradición sobre inmuebles?", outstanding: "Cita con exactitud los arts. 686, 724, 728 y 1817 del Código Civil y el principio de dualidad título-modo.", sufficient: "Identifica que se requiere inscripción conservatoria para transferir el dominio.", basic: "Menciona genéricamente el Código Civil.", insufficient: "Confunde entrega material con tradición conservatoria." },
                criterio2Hechos: { name: "Selección y uso de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hechos fácticos determinan la titularidad?", outstanding: "Identifica la inscripción de la segunda compradora en el Conservador versus la mera entrega material del primer comprador.", sufficient: "Menciona que la segunda compradora inscribió en el Conservador.", basic: "Alude solo a los contratos celebrados.", insufficient: "No identifica los actos traslaticios ni las fechas registrales." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué prevalece el título inscrito sobre la posesión material?", outstanding: "Razona que el contrato solo engendra derechos personales. Al no existir inscripción en favor del primer comprador, el vendedor conservó el dominio para enajenar válidamente a un tercero.", sufficient: "Explica que la inscripción en el Conservador prevalece sobre la entrega material.", basic: "Subsunción incompleta.", insufficient: "Afirma erróneamente que el primer comprador es dueño por haber comprado antes." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Uso riguroso de lenguaje técnico?", outstanding: "Uso impecable de 'dualidad título y modo', 'posesión inscrita', 'tradición conservatoria' y 'garantía registral'.", sufficient: "Redacción técnica ordenada y coherente.", basic: "Errores menores de redacción.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Remedios Contractuales)",
              questionText: `¿Es procedente que ${partyA.name} oponga la excepción de contrato no cumplido (Art. 1552 CC) frente a la demanda de cobro del precio deducida por ${partyB.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Sí, porque ${partyB.name} incumplió su obligación esencial de proporcionar la posesión jurídica y amparar al comprador en el dominio, por lo que su mora culpable purga la mora del comprador.` },
                { id: "b", text: "No, porque el comprador tiene el deber de pagar el precio en la fecha pactada sin formular reparo alguno, debiendo demandar después en juicio separado." },
                { id: "c", text: "No, porque el Art. 1552 CC solo es aplicable a contratos unilaterales y gratuitos según la doctrina tradicional." },
                { id: "d", text: `Sí, pero únicamente si ${partyA.name} deposita judicialmente el total del precio insoluto al momento de evacuar la contestación.` },
                { id: "e", text: "No, porque la mora en el pago de la cuota extinguió todos los derechos contractuales del comprador automáticamente." }
              ],
              explanation: "La compraventa es un contrato bilateral en que la obligación capital del vendedor consiste en entregar la cosa vendida (Art. 1793 y 1824 CC). Tratándose de inmuebles, dicha entrega exige la tradición mediante la competente inscripción y la entrega material pacífica que permita al comprador poseer como señor y dueño. Al haber transferido e inscrito el bien en favor de un tercero, el vendedor se colocó en situación de incumplimiento culpable definitivo, lo que faculta plenamente al comprador para enervar el cobro mediante la excepción del Art. 1552 CC ('la mora purga la mora').",
              officialRubric: {
                criterio1Marco: { name: "Identificación del marco normativo", maxPoints: 0.5, guidingQuestion: "¿Qué norma ampara la exceptio non adimpleti contractus?", outstanding: "Cita el Art. 1552 CC, el sinalagma contractual y los Arts. 1824 y 1826 CC sobre la obligación de entrega del vendedor.", sufficient: "Identifica la regla de 'la mora purga la mora' del Art. 1552 CC.", basic: "Menciona genéricamente el incumplimiento.", insufficient: "Cita normas impertinentes." },
                criterio2Hechos: { name: "Selección de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho configura el incumplimiento del vendedor?", outstanding: "Identifica la segunda venta e inscripción registral en favor de un tercero que privó al comprador de adquirir la posesión jurídica.", sufficient: "Menciona que el vendedor vendió dos veces la propiedad.", basic: "Alude solo al no pago de la cuota.", insufficient: "Desconoce los hechos del caso." },
                criterio3Subsuncion: { name: "Subsunción y silogismo", maxPoints: 2.0, guidingQuestion: "¿Cómo se neutraliza la exigibilidad del precio?", outstanding: "Articula el silogismo demostrando que la exigibilidad del precio presupone que el vendedor esté llano a cumplir; al transferir el dominio a otra persona, su mora neutraliza la del comprador.", sufficient: "Razona que el vendedor no puede exigir el precio si ya enajenó el bien a otra persona.", basic: "Argumentación superficial.", insufficient: "Sostiene que el comprador está en mora inexcusable." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal y sustantivo adecuado?", outstanding: "Uso exacto de 'sinalagma funcional', 'excepción de contrato no cumplido', 'mora purgada' y 'prestaciones recíprocas'.", sufficient: "Redacción comprensible y estructurada.", basic: "Imprecisiones terminológicas.", insufficient: "Lenguaje vulgar." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Acciones Reales)",
              questionText: `¿Es jurídicamente viable la demanda reconvencional reivindicatoria interpuesta por ${partyA.name} en contra de ${thirdParty.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `No, porque la acción reivindicatoria corresponde privativamente al dueño no poseedor contra el poseedor no dueño (Art. 889 CC), y ${partyA.name} nunca adquirió el dominio sobre el inmueble.` },
                { id: "b", text: `Sí, porque la entrega material previa le otorgó un dominio natural protegido por el Art. 894 CC con preferencia absoluta.` },
                { id: "c", text: `Sí, porque la acción reivindicatoria puede ser deducida por cualquier interesado en el bien raíz sin acreditar derecho real alguno.` },
                { id: "d", text: `Solo si ${thirdParty.name} es condenada previamente en sede penal por el delito de apropiación indebida.` },
                { id: "e", text: `Sí, pero únicamente si el tribunal decreta de oficio la partición forzosa del inmueble.` }
              ],
              explanation: "Conforme al Art. 889 del Código Civil, la reivindicación o acción de dominio es la que tiene el dueño de una cosa singular, de que no está en posesión, para que el poseedor de ella sea condenado a restituírsela. Por tanto, el primer presupuesto indispensable para accionar es la titularidad del derecho de dominio. Dado que el primer comprador solo tuvo la entrega material sin título inscrito, carece de derecho real de dominio y de posesión regular inscrita, resultando manifiestamente improcedente la acción reivindicatoria.",
              officialRubric: {
                criterio1Marco: { name: "Marco jurídico de la acción reivindicatoria", maxPoints: 0.5, guidingQuestion: "¿Cuáles son los requisitos del Art. 889 CC?", outstanding: "Cita con exactitud el Art. 889 CC y enumera los requisitos de la acción reivindicatoria (cosa susceptible de reivindicación, actor dueño y demandado poseedor).", sufficient: "Identifica que se debe ser dueño para reivindicar.", basic: "Menciona el Código Civil en general.", insufficient: "Desconoce los requisitos del Art. 889 CC." },
                criterio2Hechos: { name: "Selección de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué calidad jurídica ostenta el actor reconvencional?", outstanding: "Identifica que el primer comprador únicamente recibió la tenencia/entrega material y carece de inscripción en el Conservador de Bienes Raíces.", sufficient: "Menciona que el demandante no tiene título inscrito.", basic: "Alude al contrato de compraventa.", insufficient: "No advierte la falta de dominio." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento", maxPoints: 2.0, guidingQuestion: "¿Por qué fracasa la pretensión reivindicatoria?", outstanding: "Desarrolla el razonamiento demostrando que al carecer el actor del derecho real de dominio, adolece de falta de legitimación activa para reivindicar, debiendo rechazar la acción sin necesidad de ponderar la posesión de la demandada.", sufficient: "Explica que al no ser dueño no puede pedir la reivindicación.", basic: "Subsunción básica.", insufficient: "Afirma que el poseedor material puede reivindicar contra el dueño inscrito." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Lenguaje jurídico apropiado?", outstanding: "Uso riguroso de 'legitimación activa', 'acción de dominio', 'dueño no poseedor' y 'presupuestos de procedencia'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 2: LESIÓN ENORME, DOLO RETICENTE Y OBLIGACIONES DEL ABOGADO (Caso A AFG 2026-20)
      {
        id: "lesion_enorme_dolo_mandato",
        subjects: ["civil"],
        targetInsts: ["civ_lesion_enorme", "civ_dolo_vicio_consentimiento", "civ_mandato_civil"],
        linkedFuentes: { file: "civil.md", section: "Teoría del Acto Jurídico - Vicios del Consentimiento", rules: "Arts. 1458, 1888, 1889, 2116, 2129 CC" },
        linkedTopics: [{ id: "civil-clas-4-4", code: "4.4", title: "Rescisión por Lesión Enorme y Pactos Accesorios" }, { id: "civil-acto-1-4", code: "1.4", title: "Requisitos de Validez: Vicios del Consentimiento y Capacidad" }],
        dogmaticPrinciples: "La lesión enorme es un vicio objetivo taxativo: el justo precio se refiere exclusivamente al tiempo del contrato (Art. 1889 CC). Las fluctuaciones posteriores de plusvalía integran el riesgo normal del adquirente.",
        build: () => {
          const title = `Caso Práctico: Compraventa de Terreno, Lesión Enorme y Mandato Profesional (${partyA.name} c/ ${partyB.name})`;
          const facts = `En diciembre de 2024, ${partyB.name} compró a ${partyA.name} un sitio ubicado en la comuna de ${loc.comm} por la suma única de ${amt.uf}. En la compraventa se pactó que la entrega material del inmueble se haría dentro del plazo de 6 meses contados desde la suscripción del contrato. En el mismo mes de la suscripción se practicó la inscripción conservatoria a nombre de la compradora.\n\n` +
            `En marzo de 2025, ${partyA.name} se enteró, a través de un inserto publicitario y prensa local, que los terrenos de ${loc.comm} habían triplicado su valor comercial, debido al anuncio gubernamental de ampliación de la red de transporte público (Metro) hacia esa zona, cuyas obras comenzarían el año 2026.\n\n` +
            `Ante ello, ${partyA.name} acudió al ${attorney.name} con el propósito de rescindir o revertir la operación alegando haber sufrido lesión enorme y haber sido engañado por la compradora al haber ésta supuestamente omitido información relevante sobre el proyecto. El profesional constató que, en efecto, el precio de mercado había subido y que la empresa estatal comunicó oficialmente su plan de expansión recién en enero de 2025. ${partyA.name} y su abogado suscribieron una carta de honorarios para que el profesional realice el estudio de los antecedentes y la evaluación de eventuales acciones judiciales.`;

          const breakdown = {
            principales: [
              `Compraventa e inscripción de inmueble en ${loc.comm} por ${amt.uf} a precio de mercado corriente en diciembre de 2024.`,
              `Aumento sobreviniente del valor comercial a más del triple por anuncio de expansión de obras públicas en enero de 2025.`,
              `Pretensión del vendedor de rescindir la venta alegando lesión enorme y dolo por omisión (reticencia).`,
              `Suscripción de carta de honorarios con abogado para evaluación de antecedentes y viabilidad judicial.`
            ],
            secundarios: [
              "Pacto de entrega material a 6 meses de la suscripción.",
              "Publicación en inserto publicitario y prensa en marzo de 2025."
            ],
            distractores: [
              "El aumento sobreviniente del precio a más del triple tras el contrato (la lesión enorme exige que el desequilibrio del justo precio exista al tiempo del contrato, Art. 1889 CC).",
              "La afirmación de dolo por reticencia de la compradora (el anuncio de transporte fue oficial con posterioridad a la firma)."
            ],
            partes: {
              principales: `${partyA.name} (Vendedor disconforme), ${partyB.name} (Compradora con título inscrito) y ${attorney.name} (Mandatario consultor).`,
              secundarias: "Empresa de Transporte Público y Notario autorizante."
            },
            instituciones: [
              "Lesión Enorme en la Compraventa de Bienes Raíces (Arts. 1888, 1889 y 1890 CC)",
              "Dolo como Vicio del Consentimiento y Reticencia (Arts. 44 y 1458 CC)",
              "Contrato de Mandato Civil y Obligaciones del Abogado (Arts. 2116, 2118, 2129 y 2158 CC)",
              "Fuerza Obligatoria del Contrato (Art. 1545 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Acto Jurídico y Lesión Enorme)",
              questionText: `En cuanto al contrato celebrado entre ${partyA.name} y ${partyB.name}, ¿puede calificarse la situación descrita como constitutiva de lesión enorme conforme al Código Civil?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque la calificación del justo precio de la operación descrita debe considerarse estrictamente al tiempo del contrato (Art. 1889 CC) y no por circunstancias sobrevinientes." },
                { id: "b", text: "Sí, porque el valor comercial del terreno efectivamente se triplicó, provocando un perjuicio evidente y desproporcionado al patrimonio del vendedor." },
                { id: "c", text: "Sí, constituye lesión enorme y faculta al vendedor para exigir de inmediato la restitución del predio sin opción para la compradora." },
                { id: "d", text: "No, por cuanto la institución de la lesión enorme no es aplicable a la compraventa voluntaria de bienes inmuebles según el Código Civil." },
                { id: "e", text: "Sí, pero únicamente si el tribunal califica la plusvalía como una fuerza moral irresistible." }
              ],
              explanation: "Conforme al Art. 1889 del Código Civil: 'El justo precio se refiere al tiempo del contrato'. En el caso planteado, el valor comercial del predio aumentó con posterioridad en virtud del anuncio oficial de la red de transporte comunicado en enero de 2025. Al momento de contratar (diciembre de 2024), el precio convenido correspondía al valor de mercado, por lo que no existió desproporción coetánea. Además, la lesión enorme no conduce necesariamente a la rescisión, pues el Art. 1890 CC permite a la contraparte conservar el contrato completando el justo precio con deducción de una décima parte.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de la lesión enorme", maxPoints: 0.5, guidingQuestion: "¿En qué momento debe apreciarse el justo precio?", outstanding: "Cita el Art. 1889 CC señalando con precisión que el justo precio se evalúa al tiempo del contrato y cita el Art. 1890 CC.", sufficient: "Identifica que el justo precio se calcula a la fecha del contrato.", basic: "Menciona genéricamente la lesión enorme.", insufficient: "Afirma que procede por hechos posteriores." },
                criterio2Hechos: { name: "Selección de hechos cronológicos", maxPoints: 1.0, guidingQuestion: "¿Qué fechas demuestran la falta de lesión?", outstanding: "Identifica que el contrato se suscribió en diciembre de 2024 y el anuncio de Metro ocurrió en enero de 2025.", sufficient: "Menciona que la subida de precio fue posterior a la firma.", basic: "Alude al valor comercial.", insufficient: "Desconoce la cronología del caso." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento", maxPoints: 2.0, guidingQuestion: "¿Por qué una plusvalía sobreviniente no vicia el contrato?", outstanding: "Razona que la lesión enorme es un vicio objetivo coetáneo al perfeccionamiento negocial; las fluctuaciones de mercado sobrevinientes integran el riesgo normal del adquirente y no autorizan la rescisión.", sufficient: "Explica que la subida del precio ocurrió después y no vicia el contrato firmado.", basic: "Subsunción débil.", insufficient: "Sostiene que la triplicación del precio vicia la venta." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática precisa?", outstanding: "Uso de 'justo precio al tiempo del contrato', 'desequilibrio objetivo', 'rescisión por lesión enorme' y 'principio de conmutatividad'.", sufficient: "Redacción ordenada.", basic: "Errores menores.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Vicios del Consentimiento)",
              questionText: `Respecto de la actuación de la compradora ${partyB.name} y conforme a Derecho, ¿se configura una hipótesis de dolo como vicio del consentimiento?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque de la información disponible para las partes no se aprecia engaño ni maquinación al momento de contratar, habiendo sido el anuncio oficial posterior a la suscripción." },
                { id: "b", text: "Sí, porque la compradora omitió información sobre proyectos futuros, lo cual configura de pleno derecho dolo por reticencia contractual." },
                { id: "c", text: "No, pero el vendedor puede anular el contrato por error sustancial en la sustancia o calidad esencial de la cosa vendida (Art. 1454 CC)." },
                { id: "d", text: "Sí, porque en el Código Civil chileno todo negocio con plusvalía sobreviniente se presume ejecutado de mala fe." },
                { id: "e", text: "No, porque el dolo solo puede cometerse a través de hechos físicos y jamás mediante omisiones o silencios." }
              ],
              explanation: "Conforme a los Arts. 44 y 1458 del Código Civil, el dolo como vicio del consentimiento requiere que sea obra de una de las partes y que aparezca claramente que sin él no se hubiera contratado. Si bien la doctrina admite el dolo por reticencia (silencio deliberado sobre un hecho que la otra parte tenía derecho a conocer), en la especie no existió ocultamiento culpable coetáneo, puesto que la empresa de transporte hizo público su plan de expansión en enero de 2025, un mes después de firmado el contrato. Las partes negociaron en igualdad de condiciones con la información objetiva disponible al celebrar el acto.",
              officialRubric: {
                criterio1Marco: { name: "Marco jurídico del dolo civil", maxPoints: 0.5, guidingQuestion: "¿Cuáles son los presupuestos del Art. 1458 CC?", outstanding: "Cita los Arts. 44 inc. final y 1458 CC y distingue con precisión entre dolo positivo y dolo negativo (reticencia).", sufficient: "Identifica los requisitos del dolo del Art. 1458 CC.", basic: "Mención genérica de los vicios del consentimiento.", insufficient: "Desconoce el concepto de dolo." },
                criterio2Hechos: { name: "Uso de antecedentes fácticos", maxPoints: 1.0, guidingQuestion: "¿Qué antecedentes descartan el engaño?", outstanding: "Identifica que el plan de transporte no era información reservada ni conocida al momento del contrato, pues se publicó en enero de 2025.", sufficient: "Menciona que el comprador no engañó porque la noticia salió después.", basic: "Alude al precio del predio.", insufficient: "No utiliza las fechas del caso." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento", maxPoints: 2.0, guidingQuestion: "¿Por qué no concurre dolo determinante?", outstanding: "Explica que para viciar el consentimiento, la maquinación debe ser coetánea e inducir al error al contratar. Al no existir conocimiento exclusivo ni engaño anterior al contrato, la imputación de dolo carece de sustento fáctico y legal.", sufficient: "Razona que no hubo maquinación fraudulenta para hacerle vender.", basic: "Subsunción básica.", insufficient: "Afirma que la inmobiliaria actuó con dolo por ser empresa comercial." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Lenguaje jurídico apropiado?", outstanding: "Uso riguroso de 'dolo determinante', 'reticencia', 'deber de información' y 'coetaneidad negocial'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Contrato de Mandato y Obligaciones)",
              questionText: `En la convención celebrada entre ${partyA.name} y su abogado para el estudio del caso y evaluación de acciones, ¿qué calificación de la obligación del profesional es la correcta conforme al Código Civil?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "La obligación del abogado es de carácter personal, de medios y contractual, debiendo emplear la debida diligencia profesional sin garantizar la obtención de un resultado judicial favorable." },
                { id: "b", text: "La obligación del abogado es de resultado, obligándose legalmente a obtener la rescisión judicial del contrato o la devolución del predio." },
                { id: "c", text: "La convención es un contrato unilateral y gratuito mientras no se dicte sentencia de término favorable." },
                { id: "d", text: "La obligación del abogado es de orden público legal y no surge del contrato sino de una cuasidelito civil de patrocinio." },
                { id: "e", text: "Es una obligación solidaria en que el abogado asume como deudor conjunto de las deudas del cliente." }
              ],
              explanation: "El encargo profesional entre el cliente y su abogado se rige por las normas del contrato de mandato civil (Arts. 2116 y ss. CC). La obligación que asume el letrado es típicamente personal (debe ejecutar personalmente el encargo según el Art. 2129 CC), de carácter contractual y de medios: consiste en desplegar su ciencia, diligencia y prudencia conforme a la lex artis, respondiendo de la culpa leve en un mandato oneroso (Art. 2118 y 2129 CC), sin que jamás esté legalmente comprometido a asegurar un resultado judicial favorable específico.",
              officialRubric: {
                criterio1Marco: { name: "Marco jurídico del mandato profesional", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la prestación de servicios del abogado?", outstanding: "Cita los Arts. 2116, 2118 y 2129 del Código Civil y clasifica con precisión la obligación como de medios y no de resultado.", sufficient: "Identifica que la relación con el abogado es un mandato civil.", basic: "Menciona que el abogado debe hacer su trabajo.", insufficient: "Sostiene que el abogado debe garantizar el resultado." },
                criterio2Hechos: { name: "Selección de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué convención suscribieron las partes?", outstanding: "Identifica la suscripción de la carta de honorarios para el encargo específico de estudio de antecedentes y evaluación de acciones.", sufficient: "Menciona que firmaron una carta de honorarios.", basic: "Alude a la consulta con el abogado.", insufficient: "Desconoce la naturaleza del encargo." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento", maxPoints: 2.0, guidingQuestion: "¿Por qué la obligación profesional es de medios?", outstanding: "Distingue dogmáticamente entre obligación de medios y de resultado, demostrando que el profesional responde de su diligencia y lex artis en el análisis de los antecedentes, sin responder del éxito de una pretensión que adolece de sustento.", sufficient: "Explica que el abogado cobra por estudiar y litigar, no por asegurar que van a ganar.", basic: "Subsunción básica.", insufficient: "Confunde mandato con fianza de resultados." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología jurídica correcta?", outstanding: "Manejo impecable de 'obligación de medios', 'lex artis', 'mandato remunerado', 'culpa leve' y 'estándar de diligencia'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 3: MEDIDAS PREJUDICIALES PRECAUTORIAS, ACCIÓN MUEBLE, RADICACIÓN Y MANDATO (Caso B AFG 2026-20)
      {
        id: "cautelares_radicacion_mandato",
        subjects: ["procesal"],
        targetInsts: ["proc_medidas_precautorias", "proc_competencia_accion_mueble", "proc_regla_radicacion", "proc_mandato_judicial_muerte"],
        linkedFuentes: { file: "procesal.md", section: "Disposiciones Comunes y Juicio Ordinario", rules: "Arts. 580, 581 CC, Arts. 138, 529 COT, Art. 298 CPC" },
        linkedTopics: [{ id: "procesal-proc-1-3", code: "1.3", title: "La Competencia Judicial y sus Reglas" }, { id: "procesal-proc-2-2", code: "2.2", title: "Comparecencia en Juicio (Patrocinio y Mandato)" }, { id: "procesal-proc-2-6", code: "2.6", title: "Medidas Cautelares y Precautorias (Proporcionalidad)" }],
        dogmaticPrinciples: "La indemnización por defectos de obra es acción personal y mueble (Art. 581 CC), rigiendo el domicilio del deudor. El mandato judicial constituido en favor de abogados no termina por la muerte del mandante (Art. 529 COT).",
        build: () => {
          const title = `Caso Práctico: Medidas Prejudiciales Precautorias, Competencia y Mandato Judicial (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} pretende demandar en juicio declarativo de mayor cuantía a la constructora ${partyB.name}, por la defectuosa edificación de cuatro cabañas en un predio de su propiedad ubicado en la comuna de ${loc.comm}, avaluadas en un total de ${amt.clp}, solicitando una indemnización de perjuicios por dicho monto. Las partes tienen su domicilio en ${loc.city} y celebraron el contrato de obra en ${loc.comm}.\n\n` +
            `${partyA.name}, conocedor de la insolvencia de la constructora, solicitó y obtuvo prejudicialmente la medida de prohibición de celebrar actos y contratos sobre un inmueble de propiedad de la demandada avaluado en ${amt.excess}. Dicha solicitud cautelar se presentó ante el ${loc.court} y en ella contó con el patrocinio y poder del ${attorney.name}.\n\n` +
            `Posteriormente, ${partyA.name} presentó en tiempo y forma la demanda ordinaria ante el mismo tribunal que conoció de la medida prejudicial, manteniéndola el juez. Notificada de la demanda y de la cautelar, ${partyB.name} se opuso a ambas alegando que la medida era desproporcionada. El juicio continuó adelante, fijándose la audiencia de prueba testimonial para el día ${dates.hearing}, pero dos días antes de dicha fecha ${partyA.name} falleció imprevistamente, dejando cónyuge y herederos.`;

          const breakdown = {
            principales: [
              `Demanda de indemnización de perjuicios por inejecución/defecto de obra material por la suma de ${amt.clp} (acción mueble, Art. 581 CC).`,
              `Medida prejudicial de prohibición de celebrar actos y contratos trabada sobre bien de ${amt.excess}, excediendo con creces la cuantía del juicio.`,
              `Presentación oportuna de la demanda ante el mismo tribunal que conoció de la prejudicial, radicando la competencia conforme a los Arts. 109 y 178 COT.`,
              `Fallecimiento imprevisto del actor antes de la audiencia de prueba y debate sobre la vigencia del patrocinio y poder del abogado (Art. 529 COT).`
            ],
            secundarios: [
              `Ubicación de las cabañas en ${loc.comm} y domicilio de las partes en ${loc.city}.`,
              `Estado de insolvencia alegado por el actor.`
            ],
            distractores: [
              "El lugar material donde se construyeron las cabañas (la acción indemnizatoria es personal y mueble conforme al Art. 581 CC, por lo que el tribunal competente es el del domicilio del demandado, Art. 138 COT).",
              "La alegación de que la medida se decretó sin previa audiencia (las medidas prejudiciales pueden válidamente decretarse sin audiencia según el Art. 289 CPC)."
            ],
            partes: {
              principales: `${partyA.name} (Actor mandante fallecido), ${partyB.name} (Constructora demandada) y ${attorney.name} (Abogado apoderado).`,
              secundarias: `Herederos de ${partyA.name} y Juez del ${loc.court}.`
            },
            instituciones: [
              "Competencia Territorial en Acciones Personales Muebles (Arts. 580 y 581 CC, Art. 138 COT)",
              "Requisito de Proporcionalidad en Medidas Precautorias (Art. 298 CPC)",
              "Regla General de Competencia de la Radicación (Arts. 109 y 178 COT)",
              "Subsistencia del Mandato Judicial frente a la Muerte del Mandante (Art. 529 COT)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Procesal Orgánico (Competencia Relativa)",
              questionText: `¿Qué tribunal es naturalmente competente según la ley procesal para conocer de la acción indemnizatoria y de la solicitud prejudicial de ${partyA.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Un Juzgado de Letras en lo Civil de ${loc.city}, pues la acción para exigir resarcimiento de perjuicios por inejecución de obra se reputa mueble (Arts. 580 y 581 CC) y rige la regla del domicilio del demandado (Art. 138 COT).` },
                { id: "b", text: `El Juzgado de Letras de ${loc.comm}, por ser el lugar exclusivo de ubicación física de las cabañas construidas.` },
                { id: "c", text: `Cualquier tribunal de la República a libre elección del actor, por tratarse de materias de orden público absoluto.` },
                { id: "d", text: "La Corte de Apelaciones respectiva en única instancia de pleno derecho." },
                { id: "e", text: "Un tribunal arbitral forzoso designado por el Conservador de Bienes Raíces." }
              ],
              explanation: "El Art. 580 del Código Civil dispone que los derechos y acciones se reputan muebles o inmuebles según lo sea la cosa en que han de ejercerse o que se debe; y el Art. 581 CC previene expresamente que 'los hechos que se deben se reputan muebles', de modo que la acción para que se resarzan perjuicios por la inejecución o cumplimiento imperfecto de una obra es mueble. A su turno, el Art. 138 del COT establece que respecto de las acciones que se reputan muebles, a falta de estipulación de las partes, es competente el juez del domicilio del demandado (la ciudad de Santiago/domicilio).",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de competencia y bienes", maxPoints: 0.5, guidingQuestion: "¿Qué normas determinan la naturaleza de la acción y el tribunal competente?", outstanding: "Cita con precisión los Arts. 580 y 581 del CC en relación con el Art. 138 del Código Orgánico de Tribunales.", sufficient: "Identifica la regla del domicilio del demandado del Art. 138 COT.", basic: "Menciona las reglas generales de competencia.", insufficient: "Sostiene que manda el lugar del inmueble sin distinguir la acción." },
                criterio2Hechos: { name: "Selección de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hechos fácticos determinan la competencia?", outstanding: "Identifica que se demanda indemnización de perjuicios en dinero por defectos de obra y que el demandado está domiciliado en la ciudad del tribunal.", sufficient: "Menciona el domicilio del demandado y el cobro de dinero.", basic: "Alude a las cabañas en el predio.", insufficient: "Desconoce los domicilios de las partes." },
                criterio3Subsuncion: { name: "Subsunción y desarrollo del silogismo", maxPoints: 2.0, guidingQuestion: "¿Por qué no rige el tribunal del inmueble?", outstanding: "Demuestra que no se ejercita una acción real sobre el inmueble sino una acción personal indemnizatoria; al ser el objeto la suma de dinero, la acción es mueble y se radica en el fuero general del deudor.", sufficient: "Explica que al pedir indemnización en plata la acción es mueble y rige el domicilio de la demandada.", basic: "Subsunción básica.", insufficient: "Concluye erróneamente que la competencia es inmueble." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología procesal adecuada?", outstanding: "Uso riguroso de 'acción mueble', 'factor territorio', 'domicilio del demandado' y 'fuero general'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal (Medidas Cautelares)",
              questionText: `¿Cuál es el fundamento jurídico que puede hacer valer válidamente la constructora demandada para oponerse a la medida prejudicial cautelar decretada?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Que la medida es desproporcionada, pues grava un inmueble de ${amt.excess} para caucionar una demanda de ${amt.clp}, vulnerando la exigencia del Art. 298 inc. 1 CPC de limitarse a los bienes necesarios.` },
                { id: "b", text: "Que la medida es nula de pleno derecho por haberse decretado sin previa audiencia ni traslado a la demandada." },
                { id: "c", text: "Que las medidas precautorias solo proceden en juicios sumarios y jamás en juicios ordinarios de mayor cuantía." },
                { id: "d", text: "Que la prohibición de celebrar actos y contratos solo recae sobre bienes corporales muebles." },
                { id: "e", text: "Que el actor no acompañó boleta de fianza por el 100% de la tasación fiscal." }
              ],
              explanation: "El Art. 298 inc. 1 del CPC indica categóricamente que las medidas precautorias 'se limitarán a los bienes necesarios para responder por los resultados del juicio'. En el caso planteado, la deuda reclamada por perjuicios asciende a $120.000.000, mientras que la cautelar se trabó sobre un bien de $200.000.000, excediendo con creces el monto necesario para asegurar las resultas. La alegación de falta de audiencia es incorrecta, pues el Art. 289 CPC autoriza expresamente decretar prejudiciales sin oír a la contraparte en casos calificados.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de las medidas cautelares", maxPoints: 0.5, guidingQuestion: "¿Qué norma exige la proporcionalidad de las precautorias?", outstanding: "Cita el Art. 298 inc. 1 CPC y descarta con el Art. 289 CPC la necesidad de audiencia previa.", sufficient: "Identifica el Art. 298 CPC sobre limitación a bienes necesarios.", basic: "Menciona genéricamente el CPC.", insufficient: "Cita normas equivocadas." },
                criterio2Hechos: { name: "Selección y comparación fáctica", maxPoints: 1.0, guidingQuestion: "¿Qué cifras demuestran el exceso cautelar?", outstanding: "Contrasta con precisión la suma demandada ($120.000.000) versus el valor del bien gravado ($200.000.000), constatando el exceso de $80.000.000.", sufficient: "Compara el monto de la deuda con el valor del terreno embargado.", basic: "Alude solo a que el bien es caro.", insufficient: "No utiliza los valores del caso." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento", maxPoints: 2.0, guidingQuestion: "¿Por qué procede la oposición o sustitución?", outstanding: "Razona que el principio de proporcionalidad cautelar prohíbe el gravamen excesivo e injustificado del patrimonio del demandado, habilitando la oposición por desproporción manifiesta para alzarla o limitar su alcance.", sufficient: "Explica que la medida es abusiva al trabar un bien que vale casi el doble de la deuda.", basic: "Subsunción superficial.", insufficient: "Sostiene que la medida es nula por falta de audiencia previa." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal cautelar adecuado?", outstanding: "Uso de 'proporcionalidad cautelar', 'fumus boni iuris', 'periculum in mora' y 'adecuación de la medida'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal Orgánico (Mandato Judicial)",
              questionText: `Tras el fallecimiento imprevisto del actor ${partyA.name}, ¿podrá el ${attorney.name} asistir a la audiencia de prueba para representar válidamente sus derechos?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque por expresa disposición del Art. 529 del COT el mandato judicial constituido a favor de los abogados no termina por la muerte del mandante." },
                { id: "b", text: "No, porque el mandato civil se extingue indefectiblemente por la muerte del mandante según el Art. 2163 N° 5 CC sin admitir excepción alguna." },
                { id: "c", text: "Sí, pero exclusivamente bajo la figura provisional de la agencia oficiosa del Art. 6 inc. 3 CPC." },
                { id: "d", text: "No, el juicio queda suspendido de pleno derecho y debe esperarse que los herederos confieran nuevo poder notarial." },
                { id: "e", text: "Solo si el juez titular autoriza verbalmente la comparecencia mediante fianza de ratificación." }
              ],
              explanation: "Si bien el mandato civil general se extingue por la muerte del mandante conforme al Art. 2163 N° 5 del Código Civil, el mandato judicial presenta una regla especial y de orden público consagrada en el Art. 529 del Código Orgánico de Tribunales: 'El mandato constituido a favor de los abogados no termina por la muerte del mandante'. Por tanto, el abogado conserva su plena capacidad de postulación para comparecer a la audiencia de prueba y ejecutar todos los actos procesales ordinarios del juicio.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del mandato judicial", maxPoints: 0.5, guidingQuestion: "¿Qué norma consagra la subsistencia del mandato judicial?", outstanding: "Cita con exactitud el Art. 529 del COT y explica cómo hace excepción al Art. 2163 N° 5 del Código Civil.", sufficient: "Identifica la norma especial del COT que mantiene vivo el poder del abogado.", basic: "Menciona el Código Civil general.", insufficient: "Afirma que el poder murió con el mandante." },
                criterio2Hechos: { name: "Identificación fáctica del mandato", maxPoints: 1.0, guidingQuestion: "¿Qué hecho procesal concurre?", outstanding: "Identifica que el abogado contaba con patrocinio y poder judicial formalmente constituido previo a la muerte del actor.", sufficient: "Menciona que el actor le había dado poder legal a su abogado.", basic: "Alude a la muerte del demandante.", insufficient: "Confunde mandato judicial con agencia oficiosa." },
                criterio3Subsuncion: { name: "Subsunción y principio de especialidad", maxPoints: 2.0, guidingQuestion: "¿Por qué prima la regla orgánica sobre la civil?", outstanding: "Aplica el principio de especialidad normativa (Art. 4 y 13 CC), demostrando que la necesidad de no paralizar intempestivamente los litigios justifica la perpetuación legal del mandato judicial en favor de los letrados.", sufficient: "Explica que la ley protege el juicio para que no se detenga ante la muerte del cliente.", basic: "Subsunción incompleta.", insufficient: "Concluye que el juicio es nulo si el cliente falleció." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal riguroso?", outstanding: "Uso impecable de 'postulación procesal', 'principio de especialidad', 'ius postulandi' y 'mandato ad litem'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje no técnico." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 4: CLÁUSULA PENAL ENORME Y JUICIO EJECUTIVO (PLANTILLA_CASO.md)
      {
        id: "clausula_penal_ejecutivo",
        subjects: ["civil", "procesal"],
        targetInsts: ["civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones", "civ_resolucion_1489"],
        linkedFuentes: { file: "civil.md", section: "Teoría General de las Obligaciones", rules: "Arts. 1535, 1544 CC, Art. 464 N° 7 CPC" },
        linkedTopics: [{ id: "civil-las -1-6", code: "1.6", title: "El Incumplimiento Contractual y Responsabilidad" }, { id: "civil-las -1-7", code: "1.7", title: "Factores de Imputabilidad, Mora, Cláusula Penal y Perjuicios" }],
        dogmaticPrinciples: "La cláusula penal enorme en obligaciones dinerarias no puede exceder el duplo de la obligación principal (Art. 1544 CC), siendo su sanción la reducción legal al tope conmutativo y no la nulidad.",
        build: () => {
          const title = `Caso Práctico: Incumplimiento de Obra Material y Reducción de Cláusula Penal Enorme (${partyB.name} c/ ${partyA.name})`;
          const facts = `En enero de 2024, ${partyA.name} celebró un contrato de confección de obra material con ${partyB.name} para la edificación de un centro logístico comercial en ${loc.city}, por un precio total alzado de ${amt.baseContract}. En el contrato se pactó una cláusula penal moratoria en los siguientes términos: 'Por cada día de retardo injustificado en la entrega de la obra, el contratista pagará una pena de ${amt.penaltyDaily} a título de avaluación anticipada de perjuicios'.\n\n` +
            `La obra debía entregarse el 30 de junio de 2024. Sin embargo, debido a dificultades operativas imputables al contratista, la entrega se verificó con 60 días de retraso. ${partyB.name} dedujo demanda ejecutiva ante el ${loc.court}, cobrando la suma de ${amt.totalPenalty} exclusivamente por concepto de pena moratoria devengada, superando con creces el valor íntegro de la obra contratada.\n\n` +
            `${partyA.name} concurre a su estudio jurídico solicitando representación legal para enervar la ejecución o rebajar el monto exorbitante cobrado.`;

          const breakdown = {
            principales: [
              `Contrato conmutativo de confección de obra con monto determinado (${amt.baseContract}).`,
              `Estipulación de pena moratoria diaria de ${amt.penaltyDaily} por retraso.`,
              `Entrega verificada con 60 días de retraso imputable.`,
              `Demanda ejecutiva cobrando ${amt.totalPenalty} a título de pena, superando el duplo de la obligación principal.`
            ],
            secundarios: [
              "Causas de suministro que motivaron el retardo.",
              "Lugar de edificación del centro logístico."
            ],
            distractores: [
              "La pretensión de alegar la nulidad absoluta de la cláusula penal por objeto ilícito (error fatal de grado: la sanción dogmática del Art. 1544 CC no es la nulidad sino la reducción judicial al límite legal).",
              "La invocación absoluta del pacta sunt servanda (Art. 1545 CC) frente a normas de orden público protectoras contra la usura."
            ],
            partes: {
              principales: `${partyB.name} (Acreedor demandante ejecutivo) y ${partyA.name} (Contratista deudor ejecutado).`,
              secundarias: `Juez titular del ${loc.court} y Receptor judicial.`
            },
            instituciones: [
              "Cláusula Penal Enorme y Reducción al Duplo (Arts. 1535 y 1544 CC)",
              "Límites a la Autonomía de la Voluntad y Orden Público Económico",
              "Excepciones en Juicio Ejecutivo (Art. 464 N° 7 del CPC)",
              "Fuerza Obligatoria atenuada de los Contratos (Arts. 1544 y 1545 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Obligaciones y Cláusula Penal)",
              questionText: `¿Qué institución civil puede oponer el ejecutado ${partyA.name} para controvertir el monto exorbitante cobrado por concepto de pena?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "La reducción de la cláusula penal enorme al duplo de la obligación principal (Art. 1544 CC), por ser una norma de orden público que limita la desproporción lesiva." },
                { id: "b", text: "La nulidad absoluta de todo el contrato por adolecer de objeto ilícito usuario de pleno derecho." },
                { id: "c", text: "La rescisión por vicio de fuerza moral irresistible conforme al Art. 1456 del Código Civil." },
                { id: "d", text: "Ninguna, porque en virtud del Art. 1545 CC el contrato es ley intocable y el juez carece de facultades moderadoras." },
                { id: "e", text: "La compensación judicial con el impuesto al valor agregado fiscal." }
              ],
              explanation: "El Código Civil chileno regula la institución de la cláusula penal enorme en el Art. 1544. Tratándose de contratos bilaterales conmutativos en que una de las partes se obliga a pagar una cantidad determinada, la pena no puede exceder del duplo de la obligación principal. El exceso sobre dicho tope adolece de ineficacia relativa, autorizando al deudor para pedir su reducción judicial hasta el límite legal máximo permitido. No acarrea la nulidad de la cláusula sino su rebaja forzosa.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de la cláusula penal enorme", maxPoints: 0.5, guidingQuestion: "¿Qué artículo regula la reducción de la pena?", outstanding: "Cita con precisión el Art. 1544 inc. 1 CC y explica el límite del duplo de la obligación principal.", sufficient: "Identifica la figura de la cláusula penal enorme del Art. 1544 CC.", basic: "Menciona genéricamente la cláusula penal.", insufficient: "Afirma que la cláusula es nula absolutamente." },
                criterio2Hechos: { name: "Selección de hechos cuantitativos", maxPoints: 1.0, guidingQuestion: "¿Qué cifras configuran la pena enorme?", outstanding: "Contrasta el monto total de la obra ($500M) con los $600M cobrados a título de pena por 60 días de retraso.", sufficient: "Compara el valor de la obra con el monto cobrado de multa.", basic: "Alude solo a los días de retraso.", insufficient: "Desconoce los montos del caso." },
                criterio3Subsuncion: { name: "Subsunción y sanción dogmática", maxPoints: 2.0, guidingQuestion: "¿Cuál es el efecto jurídico del exceso?", outstanding: "Demuestra que la sanción legal no es la nulidad absoluta del pacto sino su reducción judicial al límite del duplo, ponderando la tensión entre autonomía contractual y orden público económico.", sufficient: "Explica que el juez debe rebajar la pena al máximo legal y no anular el contrato.", basic: "Subsunción básica.", insufficient: "Sostiene que la pena debe pagarse íntegra por pacta sunt servanda." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso exacto de 'cláusula penal enorme', 'reducción al duplo', 'avaluación convencional' e 'ineficacia parcial'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal (Juicio Ejecutivo)",
              questionText: `¿A través de qué excepción del Art. 464 del Código de Procedimiento Civil debe encauzarse la defensa de ${partyA.name} en el juicio ejecutivo?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Mediante la excepción del Art. 464 N° 7 del CPC (falta de fuerza ejecutiva del título respecto del exceso por sobre el límite legal del Art. 1544 CC)." },
                { id: "b", text: "Mediante la excepción de incompetencia absoluta por cuantía (Art. 464 N° 1 CPC)." },
                { id: "c", text: "A través de la excepción de falsedad material del título ejecutivo (Art. 464 N° 6 CPC)." },
                { id: "d", text: "Por la vía de una querella de amparo posesorio civil." },
                { id: "e", text: "Mediante recurso de queja disciplinario directo ante la Corte Suprema." }
              ],
              explanation: "En el juicio ejecutivo rige el principio de taxatividad de las excepciones del Art. 464 del CPC. Frente al cobro de una cláusula penal que excede el límite del Art. 1544 CC, el título carece de liquidez y fuerza ejecutiva por la porción que sobrepasa el máximo legalmente exigible. Dicha defensa se canaliza técnicamente bajo la excepción del Art. 464 N° 7 del CPC: 'La falta de cualquiera de los requisitos establecidos por las leyes para que dicho título tenga fuerza ejecutiva, sea absolutamente, sea con relación al ejecutado'.",
              officialRubric: {
                criterio1Marco: { name: "Marco procesal ejecutivo", maxPoints: 0.5, guidingQuestion: "¿Qué excepción del catálogo taxativo corresponde?", outstanding: "Cita el Art. 464 N° 7 del CPC y explica la noción de falta de fuerza ejecutiva por iliquidez o exceso legal.", sufficient: "Identifica la excepción del N° 7 del Art. 464 CPC.", basic: "Menciona genéricamente el juicio ejecutivo.", insufficient: "Cita excepciones impertinentes." },
                criterio2Hechos: { name: "Vinculación con los antecedentes", maxPoints: 1.0, guidingQuestion: "¿Qué defecto presenta el libelo ejecutivo?", outstanding: "Identifica que la demanda ejecutiva despacha mandamiento por una suma que desborda el límite vinculante de orden público.", sufficient: "Menciona que se cobran más millones de los que la ley permite.", basic: "Alude al cobro de la pena.", insufficient: "Desconoce el mecanismo de defensa." },
                criterio3Subsuncion: { name: "Subsunción procesal", maxPoints: 2.0, guidingQuestion: "¿Cómo opera la excepción frente al exceso?", outstanding: "Explica que la excepción del Art. 464 N° 7 permite controvertir la eficacia del título respecto de la porción excesiva sin desconocer la obligación principal adeudada hasta el tope legal.", sufficient: "Razona que el demandado puede pedir que se declare que el título no permite cobrar el exceso.", basic: "Subsunción superficial.", insufficient: "Afirma que debe pedirse el sobreseimiento penal." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal ejecutivo pulcro?", outstanding: "Uso riguroso de 'fuerza ejecutiva', 'título ejecutivo imperfecto', 'excepción perentoria' y 'mandamiento de ejecución'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Teoría General del Contrato)",
              questionText: "¿Por qué la doctrina civil chilena califica la reducción de la cláusula penal enorme como una limitación de orden público a la autonomía de la voluntad?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Porque busca evitar la usura y el enriquecimiento sin causa del acreedor, prohibiendo estipulaciones lesivas que desborden los topes imperativos que la ley fija." },
                { id: "b", text: "Porque priva a las personas jurídicas del derecho de contratar válidamente en Chile." },
                { id: "c", text: "Porque transforma las obligaciones mercantiles en contratos administrativos del Estado." },
                { id: "d", text: "Porque la ley presume de derecho que todo deudor moroso es incapaz relativo." },
                { id: "e", text: "Porque deroga las facultades jurisdiccionales de los tribunales civiles de instancia." }
              ],
              explanation: "El principio de autonomía privada (Art. 1545 CC) no es absoluto y encuentra fronteras infranqueables en las leyes prohibitivas y el orden público económico. La cláusula penal tiene por objeto avaluar anticipadamente los perjuicios, no convertirse en una herramienta de expoliación o enriquecimiento indebido. Por ello, el Art. 1544 CC tiene naturaleza imperativa y de orden público: las partes no pueden renunciar anticipadamente a solicitar la reducción de la pena exorbitante.",
              officialRubric: {
                criterio1Marco: { name: "Marco dogmático de orden público", maxPoints: 0.5, guidingQuestion: "¿Por qué el Art. 1544 CC prima sobre la autonomía privada?", outstanding: "Fundamenta en el orden público económico, el Art. 1544 CC y la prohibición del enriquecimiento injustificado.", sufficient: "Identifica que la ley protege contra la usura.", basic: "Menciona el Código Civil.", insufficient: "Afirma que el contrato no puede modificarse por ningún motivo." },
                criterio2Hechos: { name: "Relevancia del desequilibrio", maxPoints: 1.0, guidingQuestion: "¿Qué hecho demuestra la ruptura de la conmutatividad?", outstanding: "Identifica que una multa de $600M frente a una obra de $500M quiebra la correlación patrimonial básica del negocio.", sufficient: "Menciona la diferencia de montos desproporcionada.", basic: "Alude al contrato.", insufficient: "No utiliza los datos del caso." },
                criterio3Subsuncion: { name: "Subsunción y límites de la voluntad", maxPoints: 2.0, guidingQuestion: "¿Cómo se resuelve la pugna Art. 1544 vs Art. 1545?", outstanding: "Articula que el Art. 1545 CC somete la fuerza obligatoria a los límites legales del ordenamiento; el Art. 1544 CC actúa como norma correctiva de ineficacia del exceso.", sufficient: "Explica que los contratos tienen límites fijados por la ley.", basic: "Subsunción débil.", insufficient: "Confunde orden público con ilicitud penal." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Precisión técnico-jurídica?", outstanding: "Uso de 'orden público económico', 'enriquecimiento sin causa', 'autonomía de la voluntad' y 'corrección judicial'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 5: RESPONSABILIDAD MÉDICA, PÉRDIDA DE LA CHANCE Y SOLIDARIDAD (Examen 2023)
      {
        id: "responsabilidad_medica_chance",
        subjects: ["civil"],
        targetInsts: ["civ_resp_extracontractual", "civ_perdida_chance", "civ_cumulo_responsabilidades"],
        linkedFuentes: { file: "civil.md", section: "Responsabilidad Civil Extracontractual", rules: "Arts. 2314, 2317, 2320, 2329 CC" },
        linkedTopics: [{ id: "civil-clas-1-1", code: "1.1", title: "Fundamentos y Principios de la Responsabilidad Extracontractual" }, { id: "civil-clas-1-3", code: "1.3", title: "Requisitos Constitutivos: Causalidad y Daño" }],
        dogmaticPrinciples: "La falta de diagnóstico oportuno conculca la lex artis privando al paciente de la chance real de sobrevida. Las instituciones de salud responden solidariamente con el dependiente conforme a los Arts. 2320 y 2317 CC.",
        build: () => {
          const title = `Caso Práctico: Responsabilidad Médica, Pérdida de la Chance y Daño Moral por Rebote (${partyA.name} c/ ${partyB.name})`;
          const facts = `El día ${dates.breach}, ${partyA.name}, de 46 años, ingresó al Servicio de Urgencia de la clínica privada ${partyB.name} en ${loc.city}, presentando dolor torácico agudo opresivo y dificultad respiratoria severa. Fue atendido por el médico de turno, quien omitió practicar un electrocardiograma de urgencia y desestimó la sospecha coronaria, diagnosticando un espasmo muscular y prescribiendo analgésicos orales.\n\n` +
            `${partyA.name} regresó a su domicilio y 7 horas después sufrió un infarto agudo de miocardio transmural masivo. Fue reingresado de extrema urgencia a la clínica, falleciendo a las pocas horas. Informes periciales del Servicio Médico Legal y peritos cardiólogos acreditaron de forma unánime que un diagnóstico oportuno y tratamiento trombolítico dentro de las primeras dos horas habría otorgado al paciente un 75% de probabilidades estadísticas reales de sobrevida con secuelas mínimas.\n\n` +
            `La cónyuge sobreviviente y sus hijos mayores de edad dedujeron demanda de indemnización de perjuicios por responsabilidad extracontractual solidaria en contra del médico tratante y de ${partyB.name} ante el ${loc.court}, solicitando reparación del daño emergente, lucro cesante, pérdida de la chance y daño moral propio (iure propio).`;

          const breakdown = {
            principales: [
              `Ingreso del paciente a urgencia de ${partyB.name} con sintomatología cardíaca aguda evidente.`,
              "Omisión inexcusable de exámenes protocolarios (falta de electrocardiograma) contra la lex artis ad hoc.",
              "Muerte del paciente a las pocas horas por infarto agudo al miocardio masivo.",
              "Acreditación pericial certera de un 75% de probabilidad de sobrevida de haberse aplicado tratamiento oportuno.",
              "Demanda extracontractual solidaria de la familia invocando pérdida de chance y daño moral por rebote."
            ],
            secundarios: [
              "Prescripción de analgésicos para patología muscular.",
              `Lugar de los hechos en la clínica privada de ${loc.city}.`
            ],
            distractores: [
              "El debate sobre si el paciente debió reconsultar antes frente al recrudecimiento del dolor.",
              "La afirmación de la clínica de que la pérdida de la chance constituye un daño meramente hipotético o conjetural."
            ],
            partes: {
              principales: `Familiares sobrevivientes (Demandantes iure propio / víctimas por repercusión), Médico de turno y ${partyB.name} (Demandados solidarios).`,
              secundarias: `Peritos del Servicio Médico Legal y Juez del ${loc.court}.`
            },
            instituciones: [
              "Responsabilidad Extracontractual por Culpa contra la Lex Artis (Arts. 2314 y 2329 CC)",
              "Doctrina de la Pérdida de la Chance como Daño Autónomo y Cierto",
              "Responsabilidad por el Hecho de los Dependientes (Art. 2320 inc. 4 CC)",
              "Solidaridad Pasiva en Delitos y Cuasidelitos (Art. 2317 CC)",
              "Legitimación Activa por Daño Moral Propio de Víctimas por Rebote"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Responsabilidad Extracontractual y Causalidad)",
              questionText: "Frente a la omisión diagnóstica y la certeza pericial de un 75% de probabilidad de curación frustrada, ¿cómo califica la doctrina civil moderna el daño indemnizable?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Bajo la figura de la pérdida de la chance (pérdida de oportunidad), constituyendo un daño actual, autónomo y cierto consistente en la desaparición de la probabilidad de sobrevida." },
                { id: "b", text: "Como un daño eventual e hipotético que no cumple la exigencia de certeza legal y debe ser desestimado íntegramente." },
                { id: "c", text: "Como una hipótesis de caso fortuito de fuerza mayor médica absoluta." },
                { id: "d", text: "Como una responsabilidad objetiva del médico sin exigencia de culpa ni prueba de nexo de causalidad." },
                { id: "e", text: "Como un enriquecimiento sin causa exclusivo de la Isapre o aseguradora." }
              ],
              explanation: "La doctrina moderna (Barros Bourie, Diez Schwerter, Pizarro Wilson) y la jurisprudencia uniforme de la Corte Suprema reconocen que la pérdida de la chance es un daño actual y cierto en sí mismo. No se indemniza la vida como si la curación hubiera sido 100% segura, sino la pérdida de una oportunidad real, seria y fundada de curación que fue destruida irrevocablemente por la culpa médica, debiendo avaluarse de manera proporcional a dicha probabilidad frustrada (75%).",
              officialRubric: {
                criterio1Marco: { name: "Marco dogmático de la pérdida de la chance", maxPoints: 0.5, guidingQuestion: "¿Qué doctrina reconoce la certeza del daño en la chance médica?", outstanding: "Cita los Arts. 2314 y 2329 CC, doctrina de Barros Bourie y distingue la chance del daño meramente eventual.", sufficient: "Identifica la doctrina de la pérdida de la chance médica.", basic: "Menciona genéricamente el daño.", insufficient: "Afirma que el daño es eventual y no puede indemnizarse." },
                criterio2Hechos: { name: "Selección de hechos periciales", maxPoints: 1.0, guidingQuestion: "¿Qué antecedentes acreditan la oportunidad perdida?", outstanding: "Identifica la omisión del ECG y el informe pericial unánime que fijó en 75% la probabilidad de sobrevida.", sufficient: "Menciona la falta de exámenes y el porcentaje de probabilidades.", basic: "Alude solo a la muerte del paciente.", insufficient: "Desconoce los antecedentes periciales." },
                criterio3Subsuncion: { name: "Subsunción y silogismo", maxPoints: 2.0, guidingQuestion: "¿Cómo se formula la relación causal probabilística?", outstanding: "Articula el silogismo demostrando que la conducta culposa del médico fue la causa directa de la pérdida de la oportunidad que el paciente tenía de sanar, satisfaciendo el presupuesto de certeza indemnizable.", sufficient: "Explica que el médico le quitó al paciente la oportunidad real de salvarse.", basic: "Subsunción básica.", insufficient: "Sostiene que al haber muerto de infarto la culpa no influyó." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de responsabilidad?", outstanding: "Uso riguroso de 'daño autónomo', 'certeza del daño', 'pérdida de la chance', 'lex artis ad hoc' e 'imputación objetiva'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Legitimación Activa y Daño Moral)",
              questionText: "¿Tienen la cónyuge sobreviviente y los hijos legitimación activa para demandar daño moral en sede extracontractual por el fallecimiento?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, en calidad de víctimas por repercusión o rebote, ejerciendo una acción propia (iure propio) fundada en el dolor y aflicción directa que les causa la muerte del familiar (Arts. 2314 y 2329 CC)." },
                { id: "b", text: "No, porque el daño moral es personalísimo del occiso y solo se puede reclamar transmitido por sucesión por causa de muerte (iure hereditatis)." },
                { id: "c", text: "Solo si acreditan que el médico de turno fue condenado previamente en un juicio penal por homicidio culposo." },
                { id: "d", text: "No, porque el Código Civil chileno prohíbe la indemnización del daño moral en sede extracontractual." },
                { id: "e", text: "Únicamente si la clínica privada se declara en liquidación concursal forzosa." }
              ],
              explanation: "En el derecho de daños chileno se distingue con total nitidez entre la acción deducida iure hereditatis (heredada de la víctima) y la acción deducida iure propio por las víctimas por repercusión o rebote. La cónyuge y los hijos experimentan un padecimiento moral directo (pretium doloris) como consecuencia inmediata del hecho ilícito que privó de la vida a su cónyuge y padre, legitimándolos activamente al amparo del principio de reparación integral del daño (Arts. 2314 y 2329 CC).",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de legitimación por rebote", maxPoints: 0.5, guidingQuestion: "¿Qué preceptos fundan la titularidad iure propio?", outstanding: "Cita los Arts. 2314 y 2329 CC, distinguiendo con maestría la acción iure propio de la iure hereditatis.", sufficient: "Identifica la titularidad por daño moral de los familiares.", basic: "Menciona el Código Civil en general.", insufficient: "Niega la indemnización del daño moral por rebote." },
                criterio2Hechos: { name: "Selección de sujetos fácticos", maxPoints: 1.0, guidingQuestion: "¿Quiénes son los demandantes y qué reclaman?", outstanding: "Identifica la condición de cónyuge e hijos sobrevivientes y el dolor directo experimentado por la muerte del jefe de hogar.", sufficient: "Menciona a la esposa e hijos del paciente fallecido.", basic: "Alude genéricamente a la familia.", insufficient: "Confunde a las víctimas." },
                criterio3Subsuncion: { name: "Subsunción y razonamiento", maxPoints: 2.0, guidingQuestion: "¿Por qué el daño moral es propio e independiente?", outstanding: "Demuestra que la muerte del familiar genera en el círculo íntimo un daño extrapatrimonial originario y directo que no depende de la transmisión mortis causa sino del hecho ilícito que los lesiona.", sufficient: "Explica que la familia sufre dolor propio e independiente.", basic: "Subsunción débil.", insufficient: "Confunde sucesión hereditaria con acción propia." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal y civil?", outstanding: "Uso de 'víctimas por repercusión o rebote', 'pretium doloris', 'legitimación activa' e 'iure propio'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Responsabilidad por Hecho Ajeno)",
              questionText: `¿En base a qué estatuto y normas responde civilmente la clínica privada ${partyB.name} frente a la negligencia de su médico de urgencia?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Por responsabilidad por el hecho ajeno del dependiente (Art. 2320 inc. 4 CC) y falta de servicio/organización interna, existiendo solidaridad pasiva con el dependiente (Art. 2317 CC)." },
                { id: "b", text: "No responde bajo ninguna circunstancia, pues los médicos gozan de fuero legal absoluto de irresponsabilidad patronal." },
                { id: "c", text: "A través de una fianza comercial tácita que se cobra exclusivamente en la Tesorería General de la República." },
                { id: "d", text: "Solo si el paciente celebró previamente un contrato con la Superintendencia de Salud." },
                { id: "e", text: "Únicamente por la vía disciplinaria del recurso de queja judicial." }
              ],
              explanation: "Las entidades de salud privada responden tanto por culpa propia en la organización, selección y supervisión del servicio (Art. 2314 CC) como por la responsabilidad por el hecho ajeno respecto de sus dependientes que prestan servicios en el centro de salud (Art. 2320 inc. 4 CC). Al configurarse un cuasidelito cometido conjuntamente por el actuar del dependiente en el ejercicio de sus funciones, surge la obligación solidaria de indemnizar frente a la víctima conforme al Art. 2317 del Código Civil.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de responsabilidad institucional", maxPoints: 0.5, guidingQuestion: "¿Qué artículos regulan la dependencia y la solidaridad?", outstanding: "Cita con exactitud los Arts. 2320 inc. 4 y 2317 del Código Civil y la responsabilidad por culpa in vigilando / in eligendo.", sufficient: "Cita el Art. 2320 CC sobre hechos de los dependientes.", basic: "Menciona el Código Civil.", insufficient: "Afirma que la clínica no responde." },
                criterio2Hechos: { name: "Vínculo fáctico de dependencia", maxPoints: 1.0, guidingQuestion: "¿En qué contexto actuó el facultativo?", outstanding: "Identifica que el médico era facultativo de turno del Servicio de Urgencia institucional actuando en horario y recinto de la clínica.", sufficient: "Menciona que el doctor trabajaba en la clínica privada.", basic: "Alude a la urgencia médica.", insufficient: "Desconoce el vínculo de trabajo." },
                criterio3Subsuncion: { name: "Subsunción y fundamentación de solidaridad", maxPoints: 2.0, guidingQuestion: "¿Cómo se atribuye responsabilidad vicaria?", outstanding: "Desarrolla los presupuestos del Art. 2320 CC: relación de dependencia, comisión de ilícito culpable en funciones y nexo con el servicio, justificando la solidaridad legal del Art. 2317 CC.", sufficient: "Explica que la clínica debe responder solidariamente por el personal que contrata.", basic: "Subsunción superficial.", insufficient: "Sostiene que la clínica está exenta." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal y sustantivo?", outstanding: "Uso de 'responsabilidad vicaria', 'solidaridad pasiva', 'dependiente', 'culpa in eligendo' y 'culpa in vigilando'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 6: TRANSACCIÓN EXTRAJUDICIAL, EQUIVALENTE JURISDICCIONAL Y EXCEPCIÓN MIXTA (Taller Procesal Caso B)
      {
        id: "transaccion_equivalente_excepcion",
        subjects: ["procesal", "civil"],
        targetInsts: ["proc_transaccion_metodos", "civ_resolucion_1489", "proc_capacidad_ius_postulandi"],
        linkedFuentes: { file: "procesal.md", section: "Juicio Ordinario - Excepciones", rules: "Arts. 2446, 2460 CC, Arts. 304, 310 CPC" },
        linkedTopics: [{ id: "procesal-proc-2-3", code: "2.3", title: "Actos Procesales y Cosa Juzgada" }, { id: "civil-clas-2-2", code: "2.2", title: "Contratos y Equivalentes Jurisdiccionales" }],
        dogmaticPrinciples: "La transacción es un equivalente jurisdiccional que extingue el litigio produciendo efecto de cosa juzgada en última instancia (Art. 2460 CC) oponible como excepción perentoria o mixta.",
        build: () => {
          const title = `Caso Práctico: Transacción Extrajudicial, Efecto de Cosa Juzgada y Oportunidades Procesales (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} celebró un contrato de prestación de servicios y conferencia técnica con ${partyB.name} en ${loc.city}. Sin embargo, ${partyB.name} no compareció a prestar los servicios el día convenido. Para precaver un litigio eventual y futuro, el día ${dates.contract}, ambas partes suscribieron un contrato por instrumento privado en que acordaron poner término total al conflicto. En dicho acuerdo, ${partyB.name} se obligó a pagar el 80% de los perjuicios ocasionados y ${partyA.name} se obligó expresamente a no accionar judicialmente por el 20% restante ni por daño moral.\n\n` +
            `No obstante lo acordado, transcurridas dos semanas, ${partyA.name} estimó que el pacto había sido desfavorable para sus intereses y dedujo demanda ordinaria de indemnización de perjuicios por responsabilidad contractual ante el ${loc.court}, reclamando el 100% de los daños.\n\n` +
            `La demanda fue notificada válidamente a ${partyB.name} en un lugar de libre acceso público entregándole copia íntegra de la demanda y resolución. ${partyB.name} acude a su consulta jurídica para hacer valer el acuerdo extintivo frente a la demanda deducida.`;

          const breakdown = {
            principales: [
              `Contrato autocompositivo extrajudicial bilateral con recíprocas concesiones (pago del 80% y renuncia del 20%).`,
              `Acuerdo celebrado con la finalidad declarada de precaver un litigio futuro y eventual (contrato de transacción, Art. 2446 CC).`,
              "Demanda ordinaria posterior desconociendo la transacción y cobrando el 100% de los perjuicios.",
              "Notificación en lugar de libre acceso público y necesidad de hacer valer la transacción en el proceso."
            ],
            secundarios: [
              `Lugar de celebración y domicilio de las partes en ${loc.city}.`,
              "Materia original sobre conferencia y servicios técnicos."
            ],
            distractores: [
              "La notificación en lugar de libre acceso público (plenamente válida conforme al Art. 41 del CPC si se entrega copia íntegra).",
              "La calificación errónea del acuerdo como avenimiento judicial o desistimiento unilateral."
            ],
            partes: {
              principales: `${partyA.name} (Demandante que desconoce el acuerdo) y ${partyB.name} (Demandado transigente).`,
              secundarias: `Receptor judicial y Juez del ${loc.court}.`
            },
            instituciones: [
              "Contrato de Transacción y Concesiones Recíprocas (Arts. 2446 y 2460 CC)",
              "Equivalente Jurisdiccional y Eficacia de Cosa Juzgada",
              "Excepciones Mixtas y Anómalas en el Juicio Ordinario (Arts. 304, 309 y 310 CPC)",
              "Validez de la Notificación en Lugares de Libre Acceso (Art. 41 CPC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Procesal (Métodos de Solución de Conflictos)",
              questionText: "¿Qué método de solución de conflictos constituye jurídicamente el acuerdo celebrado para precaver el litigio futuro mediante concesiones recíprocas?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Autocomposición extrajudicial y bilateral, correspondiente al contrato de transacción reglamentado en los Arts. 2446 y siguientes del Código Civil." },
                { id: "b", text: "Autocomposición judicial mediante avenimiento aprobado en audiencia por el tribunal." },
                { id: "c", text: "Un mecanismo de heterocomposición arbitral forzosa de única instancia." },
                { id: "d", text: "Un acto de autotutela privada sancionado por la ley procesal." },
                { id: "e", text: "Un contrato unilateral de renuncia no vinculante." }
              ],
              explanation: "Conforme al Art. 2446 del Código Civil: 'La transacción es un contrato en que las partes terminan extrajudicialmente un litigio pendiente, o precaven un litigio eventual'. Sus dos elementos dogmáticos copulativos son la existencia de un derecho dudoso o litigioso y la realización de sacrificios o concesiones recíprocas (en este caso, aceptar pagar el 80% y renunciar al 20%). Al haberse perfeccionado fuera del proceso judicial, clasifica como una autocomposición extrajudicial bilateral.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de la transacción", maxPoints: 0.5, guidingQuestion: "¿Qué artículo define la transacción civil?", outstanding: "Cita el Art. 2446 CC y define con precisión los dos requisitos de la transacción (litigio pendiente/eventual y concesiones recíprocas).", sufficient: "Identifica que el acuerdo es una transacción civil.", basic: "Menciona genéricamente el arreglo.", insufficient: "Confunde transacción con avenimiento judicial." },
                criterio2Hechos: { name: "Selección de hechos constitutivos", maxPoints: 1.0, guidingQuestion: "¿Qué hechos demuestran las concesiones recíprocas?", outstanding: "Identifica que el deudor asumió pagar el 80% y el acreedor renunció al 20% para precaver un juicio.", sufficient: "Menciona los porcentajes pactados en el acuerdo.", basic: "Alude al contrato firmado.", insufficient: "Desconoce los términos del acuerdo." },
                criterio3Subsuncion: { name: "Subsunción y clasificación procesal", maxPoints: 2.0, guidingQuestion: "¿Cómo se clasifica dogmáticamente este método?", outstanding: "Clasifica con exactitud el acuerdo como autocomposición extrajudicial y bilateral, distinguiéndolo de figuras judiciales como la conciliación o el avenimiento procesal.", sufficient: "Explica que es un acuerdo privado entre las partes sin intervención del juez.", basic: "Subsunción superficial.", insufficient: "Afirma que es una sentencia arbitral." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática adecuada?", outstanding: "Uso de 'autocomposición bilateral', 'concesiones recíprocas', 'precaver litigio eventual' y 'equivalente jurisdiccional'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal (Oportunidades Procesales de Alegación)",
              questionText: `Frente a la demanda ordinaria deducida en su contra, ¿en qué oportunidades procesales puede ${partyB.name} alegar la transacción conforme a derecho?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Antes de la contestación como excepción dilatoria mixta (Art. 304 CPC), en la contestación como perentoria (Art. 309 CPC), o después de contestada la demanda como excepción anómala hasta antes de citación para sentencia (Art. 310 CPC)." },
                { id: "b", text: "Únicamente en el escrito de contestación de la demanda, bajo sanción de caducidad irrevocable." },
                { id: "c", text: "Solo después de dictada la sentencia definitiva mediante un recurso de aclaración o rectificación." },
                { id: "d", text: "Exclusivamente antes de contestar la demanda como excepción dilatoria simple en el plazo de emplazamiento." },
                { id: "e", text: "En cualquier momento del juicio, incluso después de citadas las partes para oír sentencia." }
              ],
              explanation: "La transacción es una excepción dotada de tratamiento procesal privilegiado en el juicio ordinario de mayor cuantía: 1) Puede oponerse como excepción mixta antes de contestar la demanda para ser tramitada y resuelta como dilatoria si está fundada en antecedente escrito (Art. 304 CPC); 2) Como excepción perentoria en la contestación de la demanda (Art. 309 CPC); y 3) Como excepción anómala en cualquier estado del juicio, desde que se contestó hasta antes de la citación para oír sentencia en primera instancia o hasta la vista de la causa en segunda instancia (Art. 310 CPC).",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo procesal", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan las excepciones mixtas y anómalas?", outstanding: "Cita con precisión los Arts. 304, 309 y 310 del Código de Procedimiento Civil.", sufficient: "Identifica que se puede oponer antes o después de la contestación.", basic: "Menciona el Código de Procedimiento Civil.", insufficient: "Limita erróneamente la alegación solo a la contestación." },
                criterio2Hechos: { name: "Antecedentes documentales del caso", maxPoints: 1.0, guidingQuestion: "¿De qué instrumento dispone el demandado?", outstanding: "Identifica que el demandado cuenta con el contrato de transacción por escrito suscrito entre las partes para fundar su excepción.", sufficient: "Menciona que existe un documento escrito del acuerdo.", basic: "Alude a la demanda notificada.", insufficient: "Desconoce los antecedentes probatorios." },
                criterio3Subsuncion: { name: "Subsunción y oportunidades procesales", maxPoints: 2.0, guidingQuestion: "¿Cómo opera la excepción de transacción en las distintas etapas?", outstanding: "Detalla con claridad las tres compuertas: excepción mixta previa (Art. 304), excepción perentoria (Art. 309) y excepción anómala posterior (Art. 310), explicando sus ventajas estratégicas.", sufficient: "Explica que puede presentarse antes de contestar o durante el juicio como excepción anómala.", basic: "Subsunción básica.", insufficient: "Afirma que precluyó el derecho por no contestar de inmediato." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal exacto?", outstanding: "Uso riguroso de 'excepción mixta', 'excepción anómala', 'citación para oír sentencia' y 'preclusión'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil y Procesal (Eficacia Jurídica de la Transacción)",
              questionText: "Conforme al Código Civil, ¿qué efecto sustantivo y procesal produce la transacción válidamente celebrada entre las partes respecto del conflicto?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Produce el efecto de cosa juzgada en última instancia entre las partes conforme al Art. 2460 del Código Civil, extinguiendo definitivamente la acción para reclamar las materias transigidas." },
                { id: "b", text: "Produce un efecto meramente moral y orientador para el juez, quien puede desestimarlo a su libre arbitrio." },
                { id: "c", text: "No produce efecto alguno mientras no sea ratificada por una sentencia penal ejecutoriada." },
                { id: "d", text: "Transforma la obligación en un delito civil de orden público." },
                { id: "e", text: "Genera la incompetencia absoluta de todos los tribunales de la República." }
              ],
              explanation: "El Art. 2460 del Código Civil consagra uno de los principios axiales de la teoría general de la transacción: 'La transacción produce el efecto de cosa juzgada en última instancia'. En consecuencia, la transacción es un equivalente jurisdiccional que reviste la misma fuerza obligatoria y extintiva que una sentencia judicial firme, dotando al demandado de una defensa perentoria inexpugnable frente a cualquier intento de revivir la controversia en sede declarativa.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del efecto de cosa juzgada", maxPoints: 0.5, guidingQuestion: "¿Qué artículo atribuye efecto de cosa juzgada a la transacción?", outstanding: "Cita con exactitud el Art. 2460 del Código Civil y define la noción de equivalente jurisdiccional.", sufficient: "Identifica que la transacción produce efecto de cosa juzgada.", basic: "Menciona el Código Civil.", insufficient: "Niega el efecto vinculante del contrato." },
                criterio2Hechos: { name: "Selección de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Sobre qué materias recayó el acuerdo?", outstanding: "Identifica que las partes acordaron regular la totalidad de los perjuicios derivados del incumplimiento de la conferencia.", sufficient: "Menciona que pactaron resolver el conflicto de la conferencia.", basic: "Alude al problema contractual.", insufficient: "Desconoce el objeto transigido." },
                criterio3Subsuncion: { name: "Subsunción y extinción de la acción", maxPoints: 2.0, guidingQuestion: "¿Por qué el demandante no puede volver a demandar?", outstanding: "Razona que la eficacia de cosa juzgada en última instancia extingue la acción ordinaria nacida del contrato original, enervando de raíz la nueva pretensión indemnizatoria por haber operado la excepción de cosa juzgada.", sufficient: "Explica que al haber firmado un acuerdo con cosa juzgada el demandante ya no tiene derecho a demandar de nuevo.", basic: "Subsunción básica.", insufficient: "Afirma que el demandante puede arrepentirse libremente." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología técnica?", outstanding: "Uso de 'equivalente jurisdiccional', 'cosa juzgada', 'excepción de cosa juzgada' y 'extinción de pretensiones'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 7: IMPARCIALIDAD JUDICIAL, PREJUZGAMIENTO Y MOMENTOS JURISDICCIONALES (Taller Procesal Caso A y C)
      {
        id: "imparcialidad_prejuzgamiento_momentos",
        subjects: ["procesal"],
        targetInsts: ["proc_imparcialidad_prejuzgamiento", "proc_momentos_jurisdiccionales", "proc_prorroga_competencia"],
        linkedFuentes: { file: "procesal.md", section: "Jurisdicción y Competencia", rules: "Art. 19 N° 3 CPR, Arts. 187 N° 2, 196 N° 10 COT" },
        linkedTopics: [{ id: "procesal-proc-1-2", code: "1.2", title: "La Función Jurisdiccional: Imparcialidad" }, { id: "procesal-proc-1-3", code: "1.3", title: "Reglas de Prórroga de la Competencia" }],
        dogmaticPrinciples: "El deber de imparcialidad del juez es manifestación esencial del debido proceso (Art. 19 N° 3 CPR); el prejuzgamiento previo da lugar a recusación. La incompetencia territorial relativa se sanea por prórroga tácita.",
        build: () => {
          const title = `Caso Práctico: Imparcialidad Judicial, Prórroga Tácita y Momentos Jurisdiccionales (${partyA.name} c/ ${partyB.name})`;
          const facts = `Ante el ${loc.court} se tramita un juicio ordinario de mayor cuantía seguido entre ${partyA.name} y ${partyB.name}, derivado de un contrato de suministro ejecutado en ${loc.city}.\n\n` +
            `En el contrato, las partes habían pactado una cláusula de prórroga expresa de competencia territorial que disponía: 'Cualquier controversia se someterá privativamente a los juzgados de Santiago'. No obstante, el actor dedujo su demanda en ${loc.city}. Notificada la demandada, compareció al juicio y presentó un escrito solicitando la suspensión de la causa por encontrarse su abogado en reposo médico, sin formular cuestionamiento alguno a la competencia del tribunal ni reservar derechos.\n\n` +
            `Posteriormente, durante una audiencia de exhibición de documentos y conciliación, la jueza titular titular manifestó a viva voz ante los apoderados: 'He examinado detenidamente los antecedentes y la posición de la parte demandada es insostenible en derecho, por lo que le aconsejo categóricamente allanarse de inmediato para evitar mayores costas'.`;

          const breakdown = {
            principales: [
              "Pacto contractual de prórroga expresa de competencia territorial a favor de Santiago.",
              `Demanda entablada ante juez de ${loc.city} donde se ejecutó la convención.`,
              "Comparecencia de la demandada realizando una gestión procesal de suspensión sin oponer la excepción de incompetencia territorial (prórroga tácita).",
              "Declaración formal de la jueza en audiencia adelantando juicio categórico de mérito de fondo en contra de la demandada."
            ],
            secundarios: [
              "Motivo de suspensión por reposo médico del letrado.",
              "Instancia de conciliación y exhibición documental."
            ],
            distractores: [
              "La estipulación previa de prórroga expresa a favor de Santiago (en negocios civiles disponibles prima la prórroga tácita posterior por apersonamiento, Art. 187 N° 2 COT).",
              "La facultad del juez de proponer bases de arreglo en conciliación (dicha facultad no autoriza a emitir juicio de fondo categórico prejuzgando la causa)."
            ],
            partes: {
              principales: `${partyA.name} (Demandante) y ${partyB.name} (Demandada).`,
              secundarias: `Jueza titular del ${loc.court} y Abogados apoderados.`
            },
            instituciones: [
              "Garantía Constitucional y Orgánica de la Imparcialidad Judicial (Art. 19 N° 3 CPR)",
              "Causal de Recusación por Prejuzgamiento o Dictamen Anticipado (Art. 196 N° 10 COT)",
              "Prórroga Tácita de la Competencia Territorial (Arts. 181, 182 y 187 N° 2 COT)",
              "Momentos de la Jurisdicción: Fase de Conocimiento vs Juzgamiento (Art. 76 CPR y Art. 1 COT)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Procesal Orgánico (Bases de la Jurisdicción)",
              questionText: "Frente a las declaraciones categóricas emitidas por la jueza en la audiencia, ¿qué garantía orgánica fue vulnerada y qué mecanismo procesal procede activar?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Fue vulnerada la Imparcialidad Judicial por prejuzgamiento formal, correspondiendo interponer un incidente de recusación conforme al Art. 196 N° 10 del COT." },
                { id: "b", text: "Fue vulnerada la Inexcusabilidad judicial, procediendo un recurso de casación en el fondo de inmediato." },
                { id: "c", text: "No se vulneró garantía alguna, pues los jueces tienen la obligación legal de compeler al allanamiento forzoso en audiencia de conciliación." },
                { id: "d", text: "Se vulneró el principio de Territorialidad, debiendo anularse el juicio de pleno derecho." },
                { id: "e", text: "Procede una demanda sumaria de indemnización de perjuicios contra el actuario del tribunal." }
              ],
              explanation: "La Imparcialidad judicial es base esencial de la jurisdicción y exigencia ineludible del debido proceso (Art. 19 N° 3 inc. 6 CPR). Si bien en la conciliación el juez puede proponer bases de arreglo sin que sus opiniones le inhabiliten para fallar (Art. 263 CPC), emitir juicios anticipados de mérito categóricos calificando la defensa de 'insostenible' y conminando al allanamiento antes de la prueba excede las facultades legales y destruye la neutralidad subjetiva. Dicha conducta tipifica la causal legal de recusación por manifestar dictamen sobre la cuestión pendiente (Art. 196 N° 10 COT).",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de imparcialidad y recusación", maxPoints: 0.5, guidingQuestion: "¿Qué norma consagra la causal de recusación por prejuzgamiento?", outstanding: "Cita con precisión el Art. 19 N° 3 CPR, el Art. 196 N° 10 del COT y deslinda las facultades del Art. 263 CPC.", sufficient: "Identifica la base de imparcialidad y el Art. 196 N° 10 COT.", basic: "Menciona el debido proceso.", insufficient: "Confunde recusación con inexcusabilidad." },
                criterio2Hechos: { name: "Selección de hechos relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho fáctico lesionó la imparcialidad?", outstanding: "Identifica la afirmación literal de la jueza calificando de 'insostenible' la defensa y exigiendo allanarse antes de la prueba.", sufficient: "Menciona que la jueza dio su opinión categórica en la audiencia.", basic: "Alude a la audiencia del tribunal.", insufficient: "No identifica las palabras del juez." },
                criterio3Subsuncion: { name: "Subsunción y desarrollo dogmático", maxPoints: 2.0, guidingQuestion: "¿Por qué las palabras configuran prejuzgamiento?", outstanding: "Razona que calificar el mérito de fondo de una parte antes de recibir la causa a prueba excede las bases amigables y destruye la neutralidad subjetiva, tipificando el supuesto del Art. 196 N° 10 COT.", sufficient: "Explica que el juez no puede decir quién va a perder antes de dictar sentencia.", basic: "Subsunción superficial.", insufficient: "Sostiene que el actuar del juez es intachable." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal adecuado?", outstanding: "Uso riguroso de 'imparcialidad subjetiva', 'prejuzgamiento', 'motivo de recusación' y 'bases de conciliación'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal Orgánico (Competencia Relativa)",
              questionText: "Habiendo existido una cláusula contractual de prórroga expresa previa a favor de Santiago, ¿quedó válidamente prorrogada la competencia ante el tribunal donde se demandó?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, operó la prórroga tácita de la competencia territorial conforme al Art. 187 N° 2 del COT, pues la demandada realizó una gestión procesal antes de oponer la incompetencia del juez." },
                { id: "b", text: "No, porque la prórroga expresa previa convenida por escrito en el contrato es irrevocable y de orden público." },
                { id: "c", text: "No, porque en el ordenamiento procesal civil chileno las reglas del territorio jamás admiten prórroga tácita." },
                { id: "d", text: "Sí, pero únicamente si el tribunal dicta una fianza especial de arraigo procesal." },
                { id: "e", text: "No, la causa debió ser remitida de oficio a la Corte Suprema de Justicia." }
              ],
              explanation: "La competencia territorial en negocios civiles contenciosos de primera instancia entre personas capaces es de derecho privado y admite prórroga voluntaria (Arts. 181 y 182 COT). Conforme al Art. 187 N° 2 del COT, se entiende prorrogada tácitamente la competencia por el demandado: 'Por el hecho de hacer, después de apersonado en el juicio, cualquiera gestión que no sea la de reclamar la incompetencia del juez'. La solicitud de suspensión sin deducir excepción dilatoria previa convalidó la competencia territorial del juez requerido, derogando la prórroga expresa anterior.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de la prórroga tácita", maxPoints: 0.5, guidingQuestion: "¿Qué norma consagra la prórroga tácita del demandado?", outstanding: "Cita con precisión los Arts. 181, 182 y 187 N° 2 del Código Orgánico de Tribunales.", sufficient: "Identifica el Art. 187 COT sobre prórroga tácita.", basic: "Menciona el COT en general.", insufficient: "Afirma que el territorio es indelegable." },
                criterio2Hechos: { name: "Selección de hechos procesales", maxPoints: 1.0, guidingQuestion: "¿Qué hecho concreto configuró la prórroga?", outstanding: "Identifica la presentación de la solicitud de suspensión sin formular reserva de incompetencia como primera gestión en el juicio.", sufficient: "Menciona que la empresa demandada compareció pidiendo suspensión sin alegar competencia.", basic: "Alude a la notificación de la demanda.", insufficient: "Desconoce los hechos del proceso." },
                criterio3Subsuncion: { name: "Subsunción y prelación de prórrogas", maxPoints: 2.0, guidingQuestion: "¿Por qué prima la prórroga tácita sobre la expresa previa?", outstanding: "Explica que la voluntad procesal contemporánea de las partes en el litigio deroga la convención previa de territorio, radicando válidamente la causa ante el tribunal requerido.", sufficient: "Razona que el actuar de la demandada en el juicio fijó definitivamente el tribunal.", basic: "Subsunción débil.", insufficient: "Concluye erróneamente que la cláusula del contrato no puede modificarse en el juicio." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal exacto?", outstanding: "Uso de 'competencia relativa', 'disponibilidad del territorio', 'prórroga tácita', 'apersonamiento' y 'radicación'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal Orgánico (Momentos de la Jurisdicción)",
              questionText: "Al celebrarse la audiencia de exhibición de documentos y conciliación previa a la prueba, ¿en qué momento de la jurisdicción se encuentra el proceso?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "En la fase de conocimiento (notio), que comprende toda la etapa de discusión, conciliación y recepción/examen de las alegaciones y probanzas de las partes (Art. 76 CPR y Art. 1 COT)." },
                { id: "b", text: "En el momento de juzgamiento irrevocable con efecto de cosa juzgada sustancial." },
                { id: "c", text: "En la fase de imperio o ejecución coactiva forzada de la sentencia definitiva." },
                { id: "d", text: "En el estadio de inavocabilidad administrativa de segunda instancia." },
                { id: "e", text: "En la fase de casación extraordinaria de única instancia." }
              ],
              explanation: "La jurisdicción se desenvuelve a través de tres momentos fundamentales consagrados en el Art. 76 de la Constitución y Art. 1 del Código Orgánico de Tribunales: conocimiento (notio), juzgamiento (iudicium) y ejecución (executio). La fase de conocimiento comprende la interposición de pretensiones, contestación, la audiencia obligatoria de conciliación (Art. 262 CPC) y la rendición de prueba. El juzgamiento se inicia formalmente con la citación para oír sentencia (Art. 432 CPC), y la ejecución tras la ejecutoriedad del fallo.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de los momentos jurisdiccionales", maxPoints: 0.5, guidingQuestion: "¿Qué preceptos consagran los momentos de la jurisdicción?", outstanding: "Cita el Art. 76 CPR y Art. 1 COT, identificando los tres momentos clásicos (notio, iudicium, executio).", sufficient: "Identifica la fase de conocimiento en la ley procesal.", basic: "Menciona los momentos en general.", insufficient: "Cita normas impertinentes." },
                criterio2Hechos: { name: "Identificación de la etapa procesal", maxPoints: 1.0, guidingQuestion: "¿En qué trámite específico se encuentra la causa?", outstanding: "Identifica la audiencia de conciliación y exhibición documental previa a la recepción a prueba y sentencia.", sufficient: "Menciona que se celebró la audiencia de conciliación.", basic: "Alude al juicio ordinario.", insufficient: "Desconoce la etapa del proceso." },
                criterio3Subsuncion: { name: "Subsunción de la fase de conocimiento", maxPoints: 2.0, guidingQuestion: "¿Por qué la conciliación integra el momento de conocer?", outstanding: "Explica que mientras no se cite a las partes para oír sentencia, el tribunal continúa en el estadio de conocer los hechos litigiosos y pretensiones, no habiendo ingresado al juzgamiento ni a la ejecución forzada.", sufficient: "Razona que el juez aún está reuniendo antecedentes y conociendo el asunto.", basic: "Subsunción básica.", insufficient: "Afirma que la conciliación es parte de la ejecución." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal orgánico?", outstanding: "Uso riguroso de 'momentos de la jurisdicción', 'notio', 'fase de conocimiento', 'citación para sentencia' e 'imperio judicial'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 8: RESOLUCIÓN CONTRACTUAL, MORA PURGA LA MORA Y PACTO COMISORIO CALIFICADO
      {
        id: "resolucion_pacto_comisorio",
        subjects: ["civil"],
        targetInsts: ["civ_resolucion_1489", "civ_excepcion_1552", "civ_pacto_comisorio_calificado", "civ_culpa_mora_deudor"],
        linkedFuentes: { file: "civil.md", section: "Efectos del Incumplimiento Sinalagmático", rules: "Arts. 1489, 1552, 1879 CC" },
        linkedTopics: [{ id: "civil-las -1-6", code: "1.6", title: "Incumplimiento Contractual y Condición Resolutoria" }, { id: "civil-clas-4-4", code: "4.4", title: "Pacto Comisorio Calificado en la Compraventa" }],
        dogmaticPrinciples: "En contratos bilaterales, la mora de una de las partes purga la mora de la contraparte (Art. 1552 CC). El pacto comisorio calificado en la compraventa por no pago del precio exige demanda y concede 24 horas para enervar (Art. 1879 CC).",
        build: () => {
          const title = `Caso Práctico: Compraventa Comercial, Pacto Comisorio Calificado y Excepción de Contrato No Cumplido (${partyA.name} c/ ${partyB.name})`;
          const facts = `Con fecha ${dates.contract}, ${partyA.name} vendió a ${partyB.name} maquinaria industrial de alta tecnología para faenas mineras en ${loc.city} por un valor de ${amt.clp}. En la escritura de compraventa se incluyó un pacto comisorio calificado con la siguiente redacción literal: 'Si el comprador no pagare el saldo del precio en el plazo estipulado, el contrato se resolverá ipso facto en el acto de pleno derecho sin necesidad de declaración judicial alguna'.\n\n` +
            `Al momento de la entrega de la maquinaria, ${partyB.name} constató que los equipos carecían de los certificados técnicos de calibración e inspección internacional comprometidos en las especificaciones técnicas del contrato, impidiendo su puesta en marcha segura. Por esta razón, ${partyB.name} retuvo el pago de la última cuota pendiente de ${amt.partial}.\n\n` +
            `${partyA.name} demandó la resolución del contrato ante el ${loc.court}, sosteniendo que por el pacto comisorio calificado la compraventa quedó resuelta de pleno derecho al vencer el plazo. Notificada judicialmente de la demanda el día ${dates.lawsuit}, ${partyB.name} consignó en la cuenta corriente del tribunal la totalidad de la cuota insoluta dentro de las 20 horas subsiguientes y opuso la excepción de contrato no cumplido (Art. 1552 CC).`;

          const breakdown = {
            principales: [
              "Contrato de compraventa con pacto comisorio calificado por no pago del precio.",
              "Entrega de maquinaria sin certificaciones técnicas convenidas indispensables para su operación.",
              "Retención justificada del pago de la cuota final por el comprador frente al defecto técnico.",
              "Consignación íntegra del precio dentro de las 24 horas siguientes a la notificación judicial de la demanda resolutoria."
            ],
            secundarios: [
              `Valor total de la maquinaria (${amt.clp}) y cuota retenida (${amt.partial}).`,
              `Lugar de entrega en ${loc.city}.`
            ],
            distractores: [
              "La redacción 'se resolverá ipso facto de pleno derecho' (en la compraventa por no pago del precio el Art. 1879 CC otorga siempre un plazo de 24 horas tras la notificación para hacer subsistir el contrato).",
              "La mora del comprador (la falta de entrega de las certificaciones técnicas pone al vendedor en mora previa, purgando la del adquirente según el Art. 1552 CC)."
            ],
            partes: {
              principales: `${partyA.name} (Vendedor demandante resolutorio) y ${partyB.name} (Comprador que consigna y opone exceptio).`,
              secundarias: `Juez titular del ${loc.court} y Receptor judicial.`
            },
            instituciones: [
              "Pacto Comisorio Calificado en la Compraventa por no pago del precio (Arts. 1877 y 1879 CC)",
              "Plazo de 24 horas subsiguientes a la notificación judicial para enervar la resolución",
              "Excepción de Contrato No Cumplido y Mora Recíproca (Art. 1552 CC)",
              "Condición Resolutoria Tácita vs Ordinaria vs Pacto Comisorio (Arts. 1489 y 1878 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Obligaciones y Pacto Comisorio)",
              questionText: `¿Operó de pleno derecho la resolución inmediata del contrato de compraventa al vencer el plazo de pago, en virtud del pacto comisorio calificado estipulado?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque por mandato imperativo del Art. 1879 del Código Civil, en la compraventa por no pago del precio el comprador puede hacer subsistir el contrato pagando dentro de las 24 horas subsiguientes a la notificación judicial de la demanda." },
                { id: "b", text: "Sí, porque la autonomía de la voluntad del Art. 1545 CC prevalece sobre cualquier norma legal supletoria o dispositiva." },
                { id: "c", text: "Sí, pero únicamente si el tribunal dicta una medida prejudicial precautoria de embargo de bienes." },
                { id: "d", text: "No, porque los pactos comisorios calificados adolecen de nulidad absoluta en todo contrato de compraventa." },
                { id: "e", text: "Sí, pero se requiere que la resolución sea ratificada por escritura pública ante el Notario autorizante." }
              ],
              explanation: "El pacto comisorio calificado en el contrato de compraventa por no pago del precio se encuentra expresamente regulado en el Art. 1879 del Código Civil. Dicho precepto establece que si bien se estipule que por no pagarse el precio se resolverá ipso facto el contrato, el comprador podrá, sin embargo, hacerlo subsistir, pagando el precio, lo más tarde, en las veinticuatro horas subsiguientes a la notificación judicial de la demanda. Por tanto, no opera de pleno derecho al mero vencimiento, requiriendo demanda judicial notificada y concesión del plazo de gracia legal.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del pacto comisorio", maxPoints: 0.5, guidingQuestion: "¿Qué artículo regula el plazo de enervación en la compraventa?", outstanding: "Cita con precisión el Art. 1879 CC y distingue el pacto comisorio calificado en la compraventa respecto de otros contratos.", sufficient: "Identifica el plazo de 24 horas del Art. 1879 CC.", basic: "Menciona el pacto comisorio general.", insufficient: "Afirma que resuelve de pleno derecho de forma irrevocable." },
                criterio2Hechos: { name: "Selección de hechos cronológicos", maxPoints: 1.0, guidingQuestion: "¿En qué plazo consignó el demandado?", outstanding: "Identifica que el comprador depositó el saldo insoluto en la cuenta corriente del tribunal dentro de las 20 horas de notificado, antes de expirar el plazo de 24 horas.", sufficient: "Menciona que pagó antes de que pasaran las 24 horas de la notificación.", basic: "Alude a que el demandado pagó el dinero.", insufficient: "Desconoce los plazos del caso." },
                criterio3Subsuncion: { name: "Subsunción y enervación de la acción", maxPoints: 2.0, guidingQuestion: "¿Cuál es el efecto jurídico del pago en 24 horas?", outstanding: "Demuestra que la consignación oportuna enerva definitivamente la pretensión resolutoria, extinguiendo la obligación de pago y haciendo subsistir plenamente la compraventa por mandato legal.", sufficient: "Explica que al pagar dentro de las 24 horas el contrato no se resuelve.", basic: "Subsunción básica.", insufficient: "Sostiene erróneamente que el vendedor puede rechazar el pago." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso exacto de 'pacto comisorio calificado', 'plazo de enervación del Art. 1879', 'resolución ipso facto' y 'consignación judicial'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Remedios Contractuales)",
              questionText: `¿Es jurídicamente admisible la excepción de contrato no cumplido (Art. 1552 CC) formulada por ${partyB.name} frente a la demanda resolutoria de ${partyA.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque la obligación de entrega del vendedor no solo abarca el traspaso material, sino la entrega conforme a las especificaciones técnicas estipuladas, por lo que su incumplimiento previo purga la mora del comprador." },
                { id: "b", text: "No, porque en los pactos comisorios calificados queda absolutamente prohibido oponer cualquier excepción de fondo." },
                { id: "c", text: "No, porque la falta de certificados técnicos es un hecho meramente accesorio que no autoriza a retener pago alguno." },
                { id: "d", text: "Solo si el comprador acredita haber iniciado una demanda por delito de estafa mercantil previa." },
                { id: "e", text: "No, porque el Art. 1552 CC fue derogado por las reglas de la Ley de Protección al Consumidor." }
              ],
              explanation: "En los contratos bilaterales las obligaciones son interdependientes (sinalagma funcional). El Art. 1828 del Código Civil dispone que el vendedor debe entregar lo que reza el contrato. Al entregar maquinaria industrial carente de los certificados técnicos de calibración expresamente pactados, el vendedor incumplió una especificación sustancial requerida para el funcionamiento seguro de los bienes. Conforme al Art. 1552 CC, ninguno de los contratantes está en mora dejando de cumplir lo pactado, mientras el otro no lo cumple por su parte.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del Art. 1552 CC", maxPoints: 0.5, guidingQuestion: "¿Qué preceptos regulan la correlatividad sinalagmática?", outstanding: "Cita el Art. 1552 CC en relación con los Arts. 1824 y 1828 CC sobre la integridad de la entrega.", sufficient: "Identifica la regla de 'la mora purga la mora' del Art. 1552 CC.", basic: "Menciona el Código Civil.", insufficient: "Niega la aplicación del Art. 1552 CC." },
                criterio2Hechos: { name: "Selección del defecto fáctico", maxPoints: 1.0, guidingQuestion: "¿Qué hecho material configura el incumplimiento del vendedor?", outstanding: "Identifica la omisión de los certificados de calibración e inspección técnica convenidos para la maquinaria minera.", sufficient: "Menciona que la maquinaria no venía con los papeles técnicos requeridos.", basic: "Alude a que los equipos fallaron.", insufficient: "Desconoce los defectos de la entrega." },
                criterio3Subsuncion: { name: "Subsunción y excepción de fondo", maxPoints: 2.0, guidingQuestion: "¿Por qué se justifica la retención del precio?", outstanding: "Razona que la excepción del Art. 1552 CC es un mecanismo de tutela preventiva que autoriza la suspensión legítima de la propia prestación mientras la contraparte no sanee su incumplimiento correlativo.", sufficient: "Explica que el comprador no está en mora si el vendedor no le entregó todo lo pactado.", basic: "Subsunción superficial.", insufficient: "Sostiene que el comprador está en mora inexcusable." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de obligaciones?", outstanding: "Uso de 'sinalagma funcional', 'exceptio non adimpleti contractus', 'mora purga la mora' e 'integridad del pago'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Clasificación de Condiciones Resolutorias)",
              questionText: "¿En qué se diferencia sustancialmente la condición resolutoria tácita (Art. 1489 CC) del pacto comisorio calificado en la compraventa por no pago del precio (Art. 1879 CC)?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "En la condición resolutoria tácita el deudor puede enervar la acción pagando durante todo el juicio hasta antes de la citación para oír sentencia, mientras que en el pacto comisorio calificado del Art. 1879 CC solo puede enervar dentro del plazo fatal de 24 horas tras la notificación de la demanda." },
                { id: "b", text: "En que la condición tácita exige escritura pública y el pacto comisorio es un acuerdo verbal no vinculante." },
                { id: "c", text: "En que el pacto comisorio calificado jamás requiere intervención de un tribunal de justicia." },
                { id: "d", text: "En que la condición del Art. 1489 CC solo opera en contratos unilaterales y el pacto comisorio en bilaterales." },
                { id: "e", text: "No existe diferencia alguna, ambas instituciones son absolutamente idénticas en tramitación y plazos." }
              ],
              explanation: "En la condición resolutoria tácita del Art. 1489 CC, la resolución se declara judicialmente en la sentencia definitiva y el demandado puede enervar válidamente la acción pagando en cualquier momento antes de la citación para oír sentencia en primera instancia o hasta la vista de la causa en segunda instancia (Art. 310 CPC). En cambio, en el pacto comisorio calificado de la compraventa por no pago del precio, el legislador restringió drásticamente la posibilidad de pago al plazo fatal y perentorio de 24 horas subsiguientes a la notificación judicial (Art. 1879 CC).",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo comparativo", maxPoints: 0.5, guidingQuestion: "¿Qué artículos sustentan la distinción de plazos?", outstanding: "Compara el Art. 1489 CC y Art. 310 CPC (excepción anómala de pago) frente al régimen especial del Art. 1879 CC.", sufficient: "Identifica la diferencia en el plazo para pagar entre ambas figuras.", basic: "Menciona el Código Civil.", insufficient: "Afirma que operan de forma idéntica." },
                criterio2Hechos: { name: "Aplicación al régimen contractual", maxPoints: 1.0, guidingQuestion: "¿Cómo impacta la cláusula en la posición de las partes?", outstanding: "Identifica que al haber pactado cláusula comisoria calificada, el comprador estaba forzado a consignar dentro de las 24 horas y no en el término del juicio ordinario.", sufficient: "Menciona la regla de las 24 horas.", basic: "Alude al contrato.", insufficient: "Desconoce los plazos." },
                criterio3Subsuncion: { name: "Subsunción y doctrina de ineficacia", maxPoints: 2.0, guidingQuestion: "¿Por qué el legislador restringe el plazo en el Art. 1879?", outstanding: "Explica que el pacto comisorio calificado agrava la posición del deudor contractual en virtud de la estipulación expresa de las partes, reduciendo el término amplio de pago ordinario al lapso legal de gracia de 24 horas.", sufficient: "Razona que el pacto comisorio apura el plazo para pagar a solo 24 horas.", basic: "Subsunción elemental.", insufficient: "Confunde ambas instituciones." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Precisión técnico-jurídica?", outstanding: "Uso de 'condición resolutoria tácita', 'pacto comisorio calificado', 'enervación de la acción', 'plazo perentorio' y 'anomalía procesal'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 9: NULIDAD ABSOLUTA POR CAUSA ILÍCITA, SIMULACIÓN Y TERCEROS POSEEDORES
      {
        id: "nulidad_absoluta_simulacion",
        subjects: ["civil"],
        targetInsts: ["civ_nulidad_absoluta", "civ_ratificacion_saneamiento_4anos", "civ_reivindicatoria"],
        linkedFuentes: { file: "civil.md", section: "Requisitos de Validez y Sanciones de Ineficacia", rules: "Arts. 1467, 1682, 1683, 1689 CC" },
        linkedTopics: [{ id: "civil-acto-1-5", code: "1.5", title: "Objeto Lícito y Causa Lícita" }, { id: "civil-acto-1-6", code: "1.6", title: "Ineficacias del Acto Jurídico (Nulidad Absoluta)" }],
        dogmaticPrinciples: "La nulidad absoluta protege el orden público; puede ser alegada por todo el que tenga interés actual en ella (Art. 1683 CC). Declarada judicialmente, da acción reivindicatoria contra terceros poseedores de buena o mala fe (Art. 1689 CC).",
        build: () => {
          const title = `Caso Práctico: Simulación Negocial, Nulidad Absoluta por Causa Ilícita y Efectos frente a Terceros (${partyA.name} c/ ${partyB.name})`;
          const facts = `En conocimiento de inminentes embargos y demandas ejecutivas por parte de acreedores bancarios, ${partyA.name} otorgó escritura pública de compraventa en ${loc.city}, mediante la cual transfirió a su amigo de confianza ${partyB.name} el dominio de un inmueble comercial avaluado en ${amt.excess}, fijando como precio simulado la suma irrisoria de $15.000.000, declarando falsamente haberlo recibido al contado con anterioridad.\n\n` +
            `Días después de inscribir en el Conservador de Bienes Raíces, ${partyB.name} vendió y transfirió materialmente el mismo inmueble a ${thirdParty.name}, quien pagó el precio de mercado corriente (${amt.clp}) desconociendo completamente las deudas del primer vendedor y el fraude urdido.\n\n` +
            `Los acreedores de ${partyA.name} descubrieron la maniobra defraudatoria e interpusieron demanda ordinaria de simulación ilícita y nulidad absoluta por causa ilícita ante el ${loc.court}, solicitando que declarada la nulidad, se ordene la restitución del inmueble directamente contra la tercera poseedora ${thirdParty.name}.`;

          const breakdown = {
            principales: [
              "Venta ostensiblemente simulada de inmueble con causa ilícita (fraude a los acreedores).",
              "Enajenación posterior a título oneroso a una tercera adquirente de buena fe que inscribe el predio.",
              "Demanda de simulación y nulidad absoluta ejercida por acreedores que ostentan interés pecuniario actual.",
              "Acción reivindicatoria dirigida contra la tercera poseedora tras la eventual sentencia de nulidad."
            ],
            secundarios: [
              "Relación de amistad entre los contratantes simulados.",
              "Diferencia abismal entre el precio declarado ($15M) y el valor real del inmueble."
            ],
            distractores: [
              "La alegación de que la nulidad se sanea en 4 años (la causal es nulidad absoluta por causa ilícita, saneable únicamente en 10 años, Art. 1683 CC).",
              "La protección del tercero de buena fe (en la nulidad civil judicialmente declarada, el Art. 1689 CC da acción reivindicatoria contra terceros sin distinguir si están de buena o mala fe, a diferencia de la resolución de los Arts. 1490 y 1491 CC)."
            ],
            partes: {
              principales: `Acreedores demandantes (con interés pecuniario), ${partyA.name} (Deudor simulado), ${partyB.name} (Adquirente simulado) y ${thirdParty.name} (Tercera poseedora de buena fe).`,
              secundarias: `Juez del ${loc.court}, Notario y Conservador de Bienes Raíces.`
            },
            instituciones: [
              "Causa Ilícita y Nulidad Absoluta (Arts. 1467, 1681 y 1682 CC)",
              "Legitimación Activa del Art. 1683 CC: todo el que tenga interés pecuniario actual",
              "Plazo de Saneamiento de la Nulidad Absoluta (10 años, no admite ratificación)",
              "Efectos de la Nulidad contra Terceros Poseedores (Art. 1689 CC vs Arts. 1490-1491 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Acto Jurídico y Nulidad)",
              questionText: "¿Tienen los acreedores de una de las partes legitimación activa para demandar la nulidad absoluta de la compraventa simulada?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque el Art. 1683 del Código Civil faculta expresamente para demandar la nulidad absoluta a 'todo el que tenga interés en ello', bastando acreditar un interés pecuniario actual derivado del fraude a sus créditos." },
                { id: "b", text: "No, porque la acción de nulidad es de ejercicio personalísimo y solo puede deducirse por las partes firmantes del contrato." },
                { id: "c", text: "Solo si cuentan con autorización previa expedida por el Ministerio Público en causa penal." },
                { id: "d", text: "No, porque los acreedores únicamente pueden ejercer la acción de quiebra forzosa." },
                { id: "e", text: "Únicamente si la deuda consta en pagaré suscrito ante dos testigos presenciales." }
              ],
              explanation: "El Art. 1683 del Código Civil establece que la nulidad absoluta puede alegarse 'por todo el que tenga interés en ello'. La doctrina y jurisprudencia uniforme de la Corte Suprema interpretan de manera pacífica que dicho interés debe ser pecuniario y actual al momento de interponerse la demanda. Los acreedores del enajenante perjudicados por el desprendimiento ficticio de bienes tienen un interés patrimonial directo en que el bien reingrese al patrimonio del deudor para hacer efectivo su derecho de prenda general (Art. 2465 CC).",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del Art. 1683 CC", maxPoints: 0.5, guidingQuestion: "¿Quiénes pueden demandar la nulidad absoluta?", outstanding: "Cita el Art. 1683 CC y define con precisión los presupuestos del interés (pecuniario, directo y actual).", sufficient: "Identifica que los acreedores con interés pueden demandar la nulidad.", basic: "Menciona el Código Civil.", insufficient: "Limita erróneamente la acción solo a las partes." },
                criterio2Hechos: { name: "Identificación del interés fáctico", maxPoints: 1.0, guidingQuestion: "¿Qué interés lesiona la enajenación fingida?", outstanding: "Identifica que la venta a precio irrisorio merma el derecho de prenda general de los bancos acreedores dejándolos sin garantía patrimonial.", sufficient: "Menciona que los acreedores quedan sin cobrar sus deudas.", basic: "Alude a las deudas del deudor.", insufficient: "Desconoce los hechos del caso." },
                criterio3Subsuncion: { name: "Subsunción y silogismo", maxPoints: 2.0, guidingQuestion: "¿Por qué se cumple el requisito de interés actual?", outstanding: "Articula que el interés de los acreedores nace coetáneamente al acto simulado, pues la enajenación fraudulenta provoca la insolvencia o disminuye el patrimonio ejecutable, configurando la legitimación activa del Art. 1683 CC.", sufficient: "Explica que los acreedores tienen derecho a pedir la nulidad para poder embargar la casa.", basic: "Subsunción superficial.", insufficient: "Sostiene que un tercero jamás puede entrometerse en un contrato ajeno." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso de 'legitimación activa', 'interés pecuniario actual', 'derecho de prenda general' y 'titularidad de la acción'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Efectos de la Nulidad frente a Terceros)",
              questionText: `Pronunciada judicialmente la nulidad absoluta de la compraventa simulada, ¿qué efecto produce respecto de la tercera adquirente ${thirdParty.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Da acción reivindicatoria contra la tercera poseedora conforme al Art. 1689 del Código Civil, sin distinguir si adquirió de buena o de mala fe." },
                { id: "b", text: "No produce efecto alguno, pues la buena fe registral del tercero purga y sanea automáticamente cualquier vicio anterior de pleno derecho." },
                { id: "c", text: "La sentencia de nulidad solo obliga a indemnizar perjuicios en dinero pero jamás permite recuperar la cosa material." },
                { id: "d", text: "Produce la extinción de todos los derechos de los acreedores por haber intervenido un tercero ajeno." },
                { id: "e", text: "Obliga a la tercera poseedora a pagar las deudas del deudor original ante la Tesorería." }
              ],
              explanation: "El Art. 1689 del Código Civil consagra una de las diferencias más drásticas entre la nulidad y la resolución contractual: 'La nulidad judicialmente pronunciada da acción reivindicatoria contra terceros poseedores; sin perjuicio de las excepciones legales'. A diferencia de lo que ocurre en la resolución (Arts. 1490 y 1491 CC, que exigen mala fe del tercero adquirente), en materia de nulidad la ley civil protege de forma radical el principio de restablecimiento al estado anterior, procediendo la reivindicación contra el tercero aunque haya adquirido a título oneroso y de buena fe.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del Art. 1689 CC", maxPoints: 0.5, guidingQuestion: "¿Qué norma regula los efectos de la nulidad contra terceros?", outstanding: "Cita con exactitud el Art. 1689 CC y lo contrasta rigurosamente con los Arts. 1490 y 1491 CC de la resolución.", sufficient: "Identifica el Art. 1689 CC sobre acción reivindicatoria contra terceros.", basic: "Menciona los efectos de la nulidad.", insufficient: "Confunde nulidad con resolución y buena fe de terceros." },
                criterio2Hechos: { name: "Calidad fáctica de la tercera poseedora", maxPoints: 1.0, guidingQuestion: "¿En qué situación se encuentra la tercera adquirente?", outstanding: "Identifica que la tercera adquirió a título oneroso e inscribió con desconocimiento del fraude (buena fe subjetiva).", sufficient: "Menciona que la compradora no sabía del engaño previo.", basic: "Alude a la compra del inmueble.", insufficient: "Desconoce los hechos de la transferencia." },
                criterio3Subsuncion: { name: "Subsunción y distinción dogmática", maxPoints: 2.0, guidingQuestion: "¿Por qué la buena fe no detiene la acción reivindicatoria del Art. 1689?", outstanding: "Desarrolla el silogismo demostrando que la nulidad judicial destruye retroactivamente el título del tradente (nemo plus iuris ad alium transferre potest quam ipse habet), despojándolo de la calidad de dueño y haciendo procedente la acción reivindicatoria frente a cualquier tercero poseedor.", sufficient: "Explica que la nulidad deja sin efecto todo lo obrado y permite recuperar el predio aunque el tercero sea inocente.", basic: "Subsunción básica.", insufficient: "Afirma erróneamente que la buena fe impide restituir el inmueble." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de bienes y nulidad?", outstanding: "Uso impecable de 'eficacia retroactiva', 'acción reivindicatoria contra terceros', 'restablecimiento al estado anterior' y 'nemo plus iuris'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Saneamiento y Ratificación)",
              questionText: "¿Cuál es el plazo de saneamiento de la nulidad absoluta por causa ilícita y procede su ratificación por las partes contratantes?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Solo se sanea por el transcurso de 10 años contados desde la celebración del acto (Art. 1683 CC) y no puede sanearse por la ratificación de las partes por ser de orden público." },
                { id: "b", text: "Se sanea en el plazo breve de 4 años y puede ser ratificada por las partes mediante instrumento privado protocolizado." },
                { id: "c", text: "Prescribe en 2 años desde que los acreedores tomaron conocimiento del negocio fraudulento." },
                { id: "d", text: "No prescribe jamás, subsistiendo de forma perpetua e imprescriptible durante 100 años." },
                { id: "e", text: "Se sanea en 6 meses mediante la publicación de tres avisos en el Diario Oficial." }
              ],
              explanation: "El Art. 1683 del Código Civil dispone perentoriamente que la nulidad absoluta: 'no puede sanearse por la ratificación de las partes, ni por un lapso de tiempo que no pase de diez años'. Al tratarse de una sanción establecida en resguardo de la moral, el orden público y la ley prohibitiva, la voluntad privada es ineficaz para convalidarla o ratificarla, operando únicamente la prescripción extraordinaria decenal de diez años.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo del saneamiento decenal", maxPoints: 0.5, guidingQuestion: "¿En qué plazo se sanea la nulidad absoluta según el Art. 1683 CC?", outstanding: "Cita el Art. 1683 CC señalando con exactitud el plazo de 10 años y la irrenunciabilidad por ratificación.", sufficient: "Identifica el plazo de 10 años de la nulidad absoluta.", basic: "Menciona que prescribe por el tiempo.", insufficient: "Confunde el plazo decenal con el cuatrienio de la nulidad relativa." },
                criterio2Hechos: { name: "Temporalidad del contrato", maxPoints: 1.0, guidingQuestion: "¿Cuánto tiempo ha transcurrido desde la firma?", outstanding: "Constata que la venta simulada es reciente (días o semanas) encontrándose plenamente vigente la acción sin asomo de prescripción.", sufficient: "Menciona que el contrato fue firmado hace poco tiempo.", basic: "Alude a la fecha del negocio.", insufficient: "Desconoce los plazos." },
                criterio3Subsuncion: { name: "Subsunción y orden público", maxPoints: 2.0, guidingQuestion: "¿Por qué no cabe ratificación?", outstanding: "Explica que la nulidad absoluta protege intereses superiores de la sociedad; las partes no pueden disponer de la validez del acto mediante confirmación, requiriéndose la consolidación del lapso de 10 años.", sufficient: "Razona que al ser nulidad absoluta las partes no pueden perdonar el vicio.", basic: "Subsunción superficial.", insufficient: "Afirma que las partes pueden ratificar libremente." },
                criterio4Precision: { name: "Claridad y precisión técnica", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso de 'prescripción adquisitiva/extintiva decenal', 'orden público', 'irratificabilidad' y 'sanción legal'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 10: GARANTÍAS CONSTITUCIONALES: RECURSO DE PROTECCIÓN VS VÍA ORDINARIA CONTRACTUAL
      {
        id: "recurso_proteccion_autotutela",
        subjects: ["constitucional"],
        targetInsts: ["const_recurso_proteccion", "const_derechos_litigiosos_dudosos"],
        linkedFuentes: { file: "constitucional.md", section: "Acciones Constitucionales - Recurso de Protección", rules: "Arts. 19 N° 24 y 20 CPR" },
        linkedTopics: [{ id: "constitucional-cons-1-2", code: "1.2", title: "Acciones Cautelares de Tutela Directa (Protección)" }, { id: "constitucional-cons-2-5", code: "2.5", title: "Orden Público Económico y Propiedad" }],
        dogmaticPrinciples: "El recurso de protección cautela el statu quo posesorio frente a actos de autotutela o vías de hecho arbitrarias (como desalojos forzados o corte de suministros), sin resolver sobre derechos contractuales dudosos de lato conocimiento.",
        build: () => {
          const title = `Caso Práctico: Recurso de Protección, Proscripción de Autotutela y Derecho de Propiedad (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} explota un local comercial de gastronomía en un inmueble de propiedad de ${partyB.name} en ${loc.city}, en virtud de un contrato de arrendamiento a plazo fijo de tres años. Con motivo de una controversia sobre el cobro de gastos comunes y reparaciones locativas, ${partyA.name} retuvo el pago de dos meses de renta por un total de ${amt.partial}.\n\n` +
            `Frente a dicha mora, el día ${dates.breach}, ${partyB.name}, sin mediar demanda judicial ni orden de tribunal alguno, concurrió al inmueble acompañado de cerrajeros, procedió a cambiar las cerraduras de acceso, cortó el suministro eléctrico y retuvo en el interior el equipamiento de cocina, maquinaria de frío y mercadería perecible avaluada en ${amt.clp}.\n\n` +
            `${partyB.name} justificó su actuar invocando una cláusula del contrato que estipulaba: 'En caso de mora superior a 30 días, el arrendador quedará facultado para recuperar de inmediato la posesión material y retener bienes del arrendatario'. ${partyA.name} interpuso Recurso de Protección ante la Corte de Apelaciones de ${loc.city}, denunciando vulneración a su derecho de propiedad (Art. 19 N° 24 CPR) y a la proscripción de autotutela y comisiones especiales (Art. 19 N° 3 inc. 5 CPR).`;

          const breakdown = {
            principales: [
              "Vía de hecho o autotutela privada consistente en corte de energía, cambio de cerraduras e incautación de bienes muebles sin auxilio de la fuerza pública ni orden judicial.",
              "Vulneración flagrante de garantías constitucionales fundamentales (derecho de propiedad y prohibición de juzgamiento por comisiones especiales).",
              "Invocación de una cláusula contractual que pretendía autorizar la justicia por mano propia.",
              "Interposición de Recurso de Protección de urgencia para restablecer el imperio del derecho y el statu quo posesorio."
            ],
            secundarios: [
              "Existencia de rentas insolutas retenidas por el arrendatario.",
              "Giro gastronómico del local comercial y naturaleza perecible de los insumos."
            ],
            distractores: [
              "La existencia de la deuda impaga de rentas (que debe cobrarse a través del juicio especial de la Ley N° 18.101 y jamás por vías de hecho unilaterales).",
              "La alegación de que el recurso de protección es improcedente por existir un contrato previo (la proscripción de la autotutela ampara la posesión frente a vías de hecho ilícitas independientemente de la validez o terminación contractual)."
            ],
            partes: {
              principales: `${partyA.name} (Arrendatario recurrente afectado) y ${partyB.name} (Arrendador propietario recurrido).`,
              secundarias: `Corte de Apelaciones de ${loc.city} y Notario.`
            },
            instituciones: [
              "Acción Constitucional de Protección (Art. 20 de la Constitución Política)",
              "Garantía del Derecho de Propiedad sobre cosas corporales e incorporales (Art. 19 N° 24 CPR)",
              "Proscripción de la Autotutela y Prohibición de Juzgamiento por Comisiones Especiales (Art. 19 N° 3 inc. 5 CPR)",
              "Límites a la Autonomía Privada: Inoponibilidad y Nulidad de Cláusulas de Autotutela (Arts. 1466 y 1467 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Constitucional (Recurso de Protección y Garantías)",
              questionText: "¿Constituyen el corte de suministros, cambio de cerraduras y retención de bienes actos arbitrarios e ilegales tutelables por la vía del recurso de protección?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque configuran actos de autotutela o vías de hecho vedadas por el ordenamiento, vulnerando la garantía del debido proceso y el derecho de propiedad sobre la posesión de los bienes (Art. 19 N° 3 inc. 5 y Art. 19 N° 24 CPR)." },
                { id: "b", text: "No, porque el arrendador es dueño absoluto del inmueble y tiene derecho constitucional a expulsar a cualquier deudor moroso sin juicio previo." },
                { id: "c", text: "No, porque los conflictos derivados de contratos de arrendamiento están expresamente excluidos del recurso de protección por mandato constitucional." },
                { id: "d", text: "Solo si el arrendatario acredita que no tiene antecedentes comerciales negativos en el Boletín Comercial." },
                { id: "e", text: "Únicamente si el Presidente de la República decreta un estado de excepción constitucional previo." }
              ],
              explanation: "El Estado de Derecho se asienta sobre la proscripción absoluta de la autotutela o justicia por mano propia (Art. 19 N° 3 inc. 5 CPR). La jurisprudencia constante y uniforme de la Corte Suprema sostiene que la actuación del arrendador que altera el statu quo cortando suministros, cambiando cerraduras o reteniendo bienes muebles sin orden judicial previa constituye un acto ilegal y arbitrario que amaga directamente la garantía del debido proceso y el derecho de propiedad del recurrente (Art. 19 N° 24 CPR), haciendo plenamente procedente la acción cautelar del Art. 20 CPR para restablecer el imperio del derecho.",
              officialRubric: {
                criterio1Marco: { name: "Marco constitucional del Art. 20 CPR", maxPoints: 0.5, guidingQuestion: "¿Qué garantías amparan al afectado frente a las vías de hecho?", outstanding: "Cita con precisión los Arts. 19 N° 3 inc. 5, 19 N° 24 y Art. 20 de la Constitución Política y el principio de proscripción de la autotutela.", sufficient: "Identifica la violación al derecho de propiedad y debido proceso.", basic: "Menciona la Constitución en general.", insufficient: "Sostiene que el propietario puede actuar por la fuerza." },
                criterio2Hechos: { name: "Selección de las vías de hecho", maxPoints: 1.0, guidingQuestion: "¿Qué actos materiales ejecutó el recurrido?", outstanding: "Identifica el ingreso unilateral con cerrajeros, el cambio de cerraduras, el corte de luz y la retención de mercaderías e inventario.", sufficient: "Menciona que le cambió las llaves y cortó los suministros sin orden de juez.", basic: "Alude a la disputa por el arriendo.", insufficient: "Desconoce los hechos materiales." },
                criterio3Subsuncion: { name: "Subsunción y restablecimiento del imperio del derecho", maxPoints: 2.0, guidingQuestion: "¿Por qué procede protección pese al vínculo contractual?", outstanding: "Demuestra que la acción cautelar no busca resolver el término del contrato sino cesar una vía de hecho ilícita e intolerable que priva al recurrente de la tenencia legítima sin debido proceso legal previo.", sufficient: "Explica que nadie puede hacer justicia por su propia mano y el juez debe ordenar reabrir el local.", basic: "Subsunción básica.", insufficient: "Concluye erróneamente que la mora autoriza las medidas de fuerza." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario constitucional adecuado?", outstanding: "Uso impecable de 'acto arbitrario e ilegal', 'vía de hecho', 'proscripción de la autotutela', 'imperio del derecho' y 'garantía cautelar'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Constitucional y Civil (Validez de Cláusulas Contractuales)",
              questionText: "¿Qué validez jurídica tiene la cláusula contractual que pretendía facultar al arrendador para ingresar y recuperar por sí mismo la posesión en caso de mora?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Carece de todo valor y es absolutamente nula por adolecer de objeto ilícito (Arts. 1466 y 1682 CC), pues la renuncia al juicio previo y la autorización de autotutela vulneran el orden público constitucional." },
                { id: "b", text: "Es plenamente válida y eficaz, pues la autonomía de la voluntad permite a las partes derogar los tribunales de justicia a su arbitrio." },
                { id: "c", text: "Es válida, pero solo produce efectos si es firmada ante un tribunal arbitral de única instancia." },
                { id: "d", text: "Se transforma automáticamente en una cláusula de fianza solidaria mercantil." },
                { id: "e", text: "Tiene valor de sentencia definitiva ejecutoriada emanada de tribunal superior." }
              ],
              explanation: "El orden público procesal y las garantías constitucionales del debido proceso son inderogables por los particulares. Conforme al Art. 1466 del Código Civil, hay objeto ilícito en todo contrato prohibido por las leyes. Ningún pacto privado puede facultar a una parte para actuar como tribunal de hecho o cometer despojos materiales al margen de la ley. Por tanto, dicha cláusula adolece de nulidad absoluta y resulta absolutamente inoponible para justificar las vías de hecho desplegadas.",
              officialRubric: {
                criterio1Marco: { name: "Marco normativo de objeto ilícito y orden público", maxPoints: 0.5, guidingQuestion: "¿Por qué una cláusula de autotutela es nula?", outstanding: "Cita los Arts. 1466 y 1682 del Código Civil en concordancia con el Art. 19 N° 3 inc. 5 de la Constitución.", sufficient: "Identifica que la cláusula es ilegal y nula por objeto ilícito.", basic: "Menciona que no se puede pactar eso.", insufficient: "Afirma que el pacto es válido por autonomía privada." },
                criterio2Hechos: { name: "Identificación de la estipulación contractual", maxPoints: 1.0, guidingQuestion: "¿Qué estipulaba la cláusula invocada?", outstanding: "Identifica el texto literal del contrato que pretendía habilitar la recuperación de posesión material y retención sin proceso judicial.", sufficient: "Menciona la cláusula del contrato de arriendo.", basic: "Alude al contrato.", insufficient: "Desconoce los términos del pacto." },
                criterio3Subsuncion: { name: "Subsunción y límites de la autonomía de la voluntad", maxPoints: 2.0, guidingQuestion: "¿Por qué el Art. 1545 CC no ampara la justicia por mano propia?", outstanding: "Razona que la autonomía privada no puede vulnerar las bases institucionales del Estado de Derecho; al convenir una comisión especial o autotutela privada, el pacto adolece de nulidad absoluta insanable.", sufficient: "Explica que nadie puede pactar en un contrato que se saltará al juez y a la policía.", basic: "Subsunción superficial.", insufficient: "Sostiene que pacta sunt servanda obliga a respetar la cláusula de fuerza." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática?", outstanding: "Uso de 'objeto ilícito', 'orden público procesal', 'inoponibilidad', 'inderogabilidad de garantías' y 'debido proceso'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal y Constitucional (Límites de la Vía de Protección)",
              questionText: "¿Cuál es el criterio uniforme de las Cortes respecto a la alegación de que los conflictos sobre cobro de rentas y restitución deben ventilarse exclusivamente en juicio de la Ley 18.101?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Que si bien la discusión sobre la terminación del contrato y cobro de rentas corresponde a la justicia ordinaria, el recurso de protección es plenamente idóneo para restablecer el imperio del derecho frente a vías de hecho inaceptables." },
                { id: "b", text: "Que el recurso de protección debe rechazarse siempre de plano si existe un contrato escrito entre las partes." },
                { id: "c", text: "Que la Corte de Apelaciones debe fijar en el recurso de protección el monto de las rentas y dictar el lanzamiento inmediato del inquilino." },
                { id: "d", text: "Que los juzgados de policía local son los únicos autorizados para conocer de vías de hecho comerciales." },
                { id: "e", text: "Que la interposición de protección extingue de pleno derecho todas las deudas del arrendatario." }
              ],
              explanation: "Es doctrina pacífica y consolidada de la Corte Suprema y de las Cortes de Apelaciones del país que, si bien la acción cautelar del Art. 20 CPR no es la vía para resolver controversias sobre cumplimiento, terminación o liquidación de contratos (derechos litigiosos de lato conocimiento), ello no obsta a que proceda plenamente cuando una de las partes comete vías de hecho o autotutela. La sentencia de protección restablece el statu quo posesorio vulnerado, ordenando reabrir el local sin perjuicio de que el arrendador deduzca su demanda ordinaria de terminación ante el juez civil competente.",
              officialRubric: {
                criterio1Marco: { name: "Marco jurisprudencial y doctrinal de protección", maxPoints: 0.5, guidingQuestion: "¿Cómo deslindan las Cortes la protección cautelar del juicio ordinario?", outstanding: "Cita el Art. 20 CPR y jurisprudencia reiterada de la Corte Suprema sobre tutela del statu quo frente a vías de hecho contractuales.", sufficient: "Identifica que la protección ampara contra vías de hecho aunque haya contrato.", basic: "Menciona el recurso de protección.", insufficient: "Afirma que el recurso reemplaza al juicio ordinario de arriendo." },
                criterio2Hechos: { name: "Separación fáctica de los conflictos", maxPoints: 1.0, guidingQuestion: "¿Qué hecho atiende la Corte y qué hecho queda para el juicio civil?", outstanding: "Distingue con nitidez el hecho de la deuda de rentas (debatible en juicio de la Ley 18.101) del hecho del desalojo forzado por mano propia (tutelable en protección).", sufficient: "Menciona que la deuda de arriendo se cobra en el juzgado pero el candado puesto es ilegal.", basic: "Alude al conflicto.", insufficient: "Confunde ambas materias." },
                criterio3Subsuncion: { name: "Subsunción y finalidad cautelar urgente", maxPoints: 2.0, guidingQuestion: "¿Por qué la Corte acoge el recurso sin declarar derechos contractuales?", outstanding: "Desarrolla el razonamiento demostrando que el fallo de protección no crea ni extingue derechos contractuales, sino que restablece provisionalmente el imperio de la legalidad frente a un acto arbitrario, remitiendo el fondo a la sede judicial correspondiente.", sufficient: "Explica que la Corte ordena devolver las llaves para que vayan a demandar como corresponde al tribunal.", basic: "Subsunción básica.", insufficient: "Sostiene que la Corte resuelve el término del arriendo." },
                criterio4Precision: { name: "Claridad y rigor técnico", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal constitucional?", outstanding: "Uso riguroso de 'statu quo posesorio', 'derechos indubitados', 'lato conocimiento', 'provisionalidad cautelar' y 'tutela de urgencia'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          return { title, facts, breakdown, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      }
    ];

    // MOTOR DE AFINIDAD PONDERADA:
    let scoredArchetypes = archetypes.map(arch => {
      let matchCount = 0;
      let subjectBonus = 0;

      arch.targetInsts.forEach(tId => {
        if (instIds.includes(tId)) {
          matchCount += 15;
        }
      });

      selectedInstitutions.forEach(inst => {
        if (arch.subjects.includes(inst.subject)) {
          subjectBonus += 2;
        }
      });

      return {
        archetype: arch,
        score: matchCount + subjectBonus
      };
    });

    scoredArchetypes.sort((a, b) => b.score - a.score);

    const maxScore = scoredArchetypes[0]?.score || 0;
    const topCandidates = scoredArchetypes.filter(item => item.score >= maxScore && item.score > 0);

    let chosenArchetype;
    if (topCandidates.length > 0) {
      chosenArchetype = this.pickRandom(topCandidates).archetype;
    } else {
      chosenArchetype = this.pickRandom(archetypes);
    }

    const builtCase = chosenArchetype.build();

    return {
      id: `caso-ia-${timestamp}-${randomSuffix}`,
      title: builtCase.title,
      subjects: chosenArchetype.subjects,
      difficulty: "Nivel Grado",
      summary: builtCase.facts.slice(0, 140).replace(/\n/g, ' ') + "...",
      facts: builtCase.facts,
      isImportedFromCasosFolder: true,
      isGeneratedByAI: true,
      isFree: true,
      sourceCategory: "generado_ia",
      sourceCategoryLabel: "Agente IA (Protocolo AFG 2026-20)",
      sourceFile: `IA-Grado-Caso-${new Date().toISOString().slice(0, 10)}.md`,
      linkedFuentes: chosenArchetype.linkedFuentes || null,
      linkedTopics: chosenArchetype.linkedTopics || [],
      dogmaticPrinciples: chosenArchetype.dogmaticPrinciples || "", 
      factsBreakdown: builtCase.breakdown,
      questions: builtCase.questions,
      createdAt: timestamp,
      expiresAt: timestamp + (7 * 24 * 3600 * 1000),
      methodology: {
        conflict: builtCase.breakdown.principales ? builtCase.breakdown.principales.join(" ") : "Conflicto interdisciplinario de nivel examen de grado.",
        legalBasis: builtCase.breakdown.instituciones || ["Normativa sustantiva y procesal oficial"],
        applicationReasoning: "El caso exige discriminar hechos determinantes frente a distractores y subsumir en las hipótesis normativas aplicables de la Rúbrica Oficial AIME.",
        dogmaticFramework: "Doctrina uniforme de examen de grado chileno."
      },
      modelSolution: "Revisar la justificación y desglose oficial en cada una de las 3 preguntas de alternativas."
    };
  }
};

if (typeof window !== "undefined") {
  window.CaseGeneratorAgent = CaseGeneratorAgent;
}
if (typeof globalThis !== "undefined") {
  globalThis.CaseGeneratorAgent = CaseGeneratorAgent;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CaseGeneratorAgent;
}
