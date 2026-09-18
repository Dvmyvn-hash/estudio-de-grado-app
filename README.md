# ⚖️ ESTUDIO DE GRADO - PLATAFORMA DE PREPARACIÓN INTERACTIVA
### Derecho Civil · Derecho Procesal · Derecho Constitucional

Plataforma interactiva diseñada para la preparación del Examen de Grado en Derecho, basada en apuntes de **NotebookLM ("ESTUDIO DE GRADO")**, con interconexión de instituciones jurídicas, grafo visual de conceptos y un taller de resolución de casos prácticos con metodología dogmática.

---

## 🚀 Cómo Iniciar la Aplicación

Tienes dos opciones muy sencillas:

### Opción A: Abrir directamente en el navegador (Sin requerir servidores)
Haz doble clic sobre el archivo `index.html` o ábrelo en tu navegador favorito (Chrome, Edge, Opera, Firefox).

### Opción B: Ejecutar con el servidor local de Python
Abre una terminal PowerShell en esta carpeta y ejecuta:
```powershell
python -m http.server 8000
```
Luego abre tu navegador en: [http://localhost:8000](http://localhost:8000)

---

## 📚 Módulos y Funcionalidades Principales

### 1. Temario & Apuntes (Knowledge Hub)
- **Navegación por Cédulas:** Filtra por materia (*Civil*, *Procesal*, *Constitucional*) o revisa todas las instituciones.
- **Visualizador Markdown Enriquecido:** Citas doctrinales, artículos destacados y enlaces internos estilo `[[Wikilink]]`.
- **Panel Lateral de Conexiones:** Muestra al instante qué otras instituciones se cruzan con el tema que estás estudiando y qué casos prácticos lo aplican.
- **Control de Dominio:** Marca temas como *"Dominado"* o *"Por repasar"* para monitorear tu porcentaje de avance hacia el grado.

### 2. Taller Metodológico de Casos Prácticos (4 Dimensiones)
Resuelve casos reales de examen de grado siguiendo la metodología dogmática requerida por las comisiones:
1. **Hechos Relevantes & Conflicto Jurídico:** Identificación de la litis.
2. **Fundamento Normativo:** Artículos de los Códigos (Civil, CPC) y de la Constitución Política.
3. **Subsunción y Razonamiento:** Encaje fáctico y silogismo jurídico paso a paso.
4. **Dogmática y Doctrina Jurídica:** Categorías doctrinales en juego (*Drittwirkung*, teoría de la imprevisión, principio de congruencia, culpa in contrahendo, etc.).
- **Comparación con Solución Modelo:** Contrasta tus respuestas escritas con el criterio de corrección y argumentación de grado.

### 3. Grafo de Instituciones Jurídicas
- Visualizador interactivo de red con física de fuerzas.
- Arrastra nodos, haz zoom y haz clic en cualquier institución para inspeccionar sus vínculos cruzados entre ramas del derecho y saltar a los apuntes.

### 4. Gestor de Apuntes y NotebookLM
- **Importar Notas:** Pega resúmenes o notas generadas en tu cuaderno de NotebookLM para incorporarlas instantáneamente al temario y al buscador.
- **Fuentes en Markdown:** Los archivos en la carpeta `fuentes/` (`civil.md`, `procesal.md`, `constitucional.md`) sirven como repositorio de texto estructurado.
- **Respaldos:** Exporta e importa copias de seguridad en archivo `.json` para nunca perder tus avances o notas.

---

## ⌨️ Atajos Útiles
- **`Ctrl + K`**: Abre el buscador global instantáneo para localizar normas, instituciones, cédulas o casos prácticos.
- **`Esc`**: Cierra modales o resultados de búsqueda.
