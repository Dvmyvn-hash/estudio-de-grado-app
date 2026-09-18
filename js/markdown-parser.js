/**
 * PARSER DE MARKDOWN JURÍDICO INTEGRAL
 * Renderiza fielmente apuntes de grado con encabezados multinivel (h1 a h6),
 * tablas comparativas, mapas conceptuales, red flags, citas normativas y listas.
 */

const MarkdownParser = {
  render(text) {
    if (!text) return "";

    let html = text;

    // 1. Escapar caracteres HTML básicos (excepto si son necesarios)
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Wikilinks [[Institución]]
    html = html.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
      const cleanTarget = p1.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<span class="wikilink" data-wikilink="${cleanTarget}" title="Ver institución jurídica">${cleanTarget}</span>`;
    });

    // 3. Destacar cajas de "Red Flags" y "Mapas Conceptuales"
    html = html.replace(/#{1,6}\s*\*{0,2}(?:Puntos Cr[íi]ticos para el Examen de Grado|Red Flags)[^\n\r]*/gi, 
      '<div class="callout-card callout-warning"><div class="callout-title">⚠️ PUNTOS CRÍTICOS PARA EL EXAMEN DE GRADO (RED FLAGS)</div>');

    html = html.replace(/#{1,6}\s*\*{0,2}MAPA CONCEPTUAL\*{0,2}/gi,
      '<div class="callout-card callout-concept"><div class="callout-title">🗺️ ESQUEMA / MAPA CONCEPTUAL DOGMÁTICO</div>');

    // 4. Tablas en Markdown (| col 1 | col 2 | ...)
    html = this.parseTables(html);

    // 5. Encabezados multinivel (h6 a h1 en orden inverso para evitar conflictos)
    // Limpiamos asteriscos sobrantes dentro de los títulos
    const cleanHeader = (str) => {
      return str.trim().replace(/^\*{1,2}(.*?)\*{1,2}$/, '$1').trim();
    };

    html = html.replace(/^######\s+(.*$)/gim, (_, m) => `<h6 class="reading-h6">${cleanHeader(m)}</h6>`);
    html = html.replace(/^#####\s+(.*$)/gim, (_, m) => `<h5 class="reading-h5">${cleanHeader(m)}</h5>`);
    html = html.replace(/^####\s+(.*$)/gim, (_, m) => `<h4 class="reading-h4">${cleanHeader(m)}</h4>`);
    html = html.replace(/^###\s+(.*$)/gim, (_, m) => `<h3 class="reading-h3">${cleanHeader(m)}</h3>`);
    html = html.replace(/^##\s+(.*$)/gim, (_, m) => `<h2 class="reading-h2">${cleanHeader(m)}</h2>`);
    html = html.replace(/^#\s+(.*$)/gim, (_, m) => `<h1 class="reading-h1">${cleanHeader(m)}</h1>`);

    // 6. Blockquotes
    html = html.replace(/^&gt;\s?(.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/gim, '<br>');

    // 7. Negrita y cursiva
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/_([^_]+)_/gim, '<em>$1</em>');
    html = html.replace(/\*([^\*]+)\*/gim, '<em>$1</em>');

    // 8. Código en línea
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // 9. Separadores horizontales
    html = html.replace(/^---$/gim, '<hr class="reading-divider">');

    // 10. Listas numeradas y con viñetas
    html = html.replace(/^\s*(\d+)[\.\)]\s+(.*$)/gim, '<div class="ol-item"><span class="ol-num">$1.</span> <span class="ol-content">$2</span></div>');
    html = html.replace(/^\s*[\-\*•▪]\s+(.*$)/gim, '<div class="ul-item"><span class="ul-bullet">▪</span> <span class="ul-content">$1</span></div>');

    // 11. Párrafos (separados por doble salto)
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // No envolver si ya es un elemento de bloque HTML
      if (/^<(h[1-6]|table|thead|tbody|tr|td|th|block|div|hr|ul|ol)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p class="reading-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join("\n\n");

    return html;
  },

  // Parser robusto de tablas Markdown
  parseTables(text) {
    const lines = text.split("\n");
    const result = [];
    let inTable = false;
    let tableLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isTableLine = line.startsWith("|") && line.endsWith("|");

      if (isTableLine) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          result.push(this.renderSingleTable(tableLines));
          tableLines = [];
          inTable = false;
        }
        result.push(lines[i]);
      }
    }

    if (inTable && tableLines.length > 0) {
      result.push(this.renderSingleTable(tableLines));
    }

    return result.join("\n");
  },

  renderSingleTable(lines) {
    if (lines.length < 2) return lines.join("\n");

    // Limpiar celdas
    const parseRow = (rowStr) => {
      const parts = rowStr.split("|");
      // Quitar primer y último elemento vacío por los pipes de los extremos
      return parts.slice(1, -1).map(c => c.trim());
    };

    const headerCells = parseRow(lines[0]);
    // Comprobar si la línea 1 es el separador (|---|---|)
    const isSep = /^\|?\s*:?-+:?\s*\|/.test(lines[1]);
    const bodyStartIdx = isSep ? 2 : 1;

    let tableHtml = '<div class="table-responsive"><table class="reading-table"><thead><tr>';
    headerCells.forEach(cell => {
      tableHtml += `<th>${cell}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    for (let j = bodyStartIdx; j < lines.length; j++) {
      const cells = parseRow(lines[j]);
      tableHtml += '<tr>';
      cells.forEach(c => {
        tableHtml += `<td>${c}</td>`;
      });
      tableHtml += '</tr>';
    }

    tableHtml += '</tbody></table></div>';
    return tableHtml;
  }
};
