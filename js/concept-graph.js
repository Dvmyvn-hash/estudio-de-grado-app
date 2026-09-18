/**
 * CONCEPT GRAPH - VISUALIZADOR INTERACTIVO DE INSTITUCIONES JURÍDICAS
 * Simulación física con Canvas HTML5 (fuerzas elásticas y repulsión)
 * Permite explorar cómo se interconectan Civil, Procesal y Constitucional.
 */

const ConceptGraph = {
  container: null,
  canvas: null,
  ctx: null,
  nodes: [],
  links: [],
  selectedNode: null,
  draggedNode: null,
  isDragging: false,
  panX: 0,
  panY: 0,
  scale: 1,
  startMouseX: 0,
  startMouseY: 0,
  activeFilter: "all",
  animationId: null,

  init(containerEl) {
    this.container = containerEl;
    this.render();
  },

  render() {
    this.container.innerHTML = `
      <div class="graph-layout">
        
        <!-- CONTROLES FLOTANTES -->
        <div class="graph-floating-controls">
          <button class="icon-btn btn-sm" id="btn-zoom-in" title="Acercar">
            <i data-lucide="zoom-in"></i>
          </button>
          <button class="icon-btn btn-sm" id="btn-zoom-out" title="Alejar">
            <i data-lucide="zoom-out"></i>
          </button>
          <button class="icon-btn btn-sm" id="btn-zoom-reset" title="Restablecer vista">
            <i data-lucide="maximize-2"></i>
          </button>
        </div>

        <!-- LEYENDA FLOTANTE -->
        <div class="graph-legend-floating">
          <div class="legend-title">Materias del Grado</div>
          <div class="legend-item"><span class="legend-color civil"></span> Civil</div>
          <div class="legend-item"><span class="legend-color procesal"></span> Procesal</div>
          <div class="legend-item"><span class="legend-color constitucional"></span> Constitucional</div>
          <div class="legend-item"><span class="legend-color cross"></span> Institución Transversal</div>
        </div>

        <!-- VIEWPORT DE CANVAS -->
        <div class="graph-viewport-wrapper" id="graph-wrapper">
          <canvas id="graph-canvas"></canvas>
        </div>

        <!-- PANEL LATERAL INSPECTOR DE NODO -->
        <aside class="graph-inspector-panel hidden" id="graph-inspector">
          <!-- Inyectado al hacer clic en un nodo -->
        </aside>

      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.canvas = this.container.querySelector('#graph-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.setupData();
    this.resizeCanvas();
    this.bindCanvasEvents();
    this.startSimulation();
  },

  setupData() {
    const data = StorageService.getData();
    const graphData = data.graph || INITIAL_DATA.graph;

    // Clonar nodos y asignar posiciones iniciales en círculo
    const count = graphData.nodes.length;
    const centerX = this.canvas ? this.canvas.width / 2 : 400;
    const centerY = this.canvas ? this.canvas.height / 2 : 300;
    const radius = Math.min(centerX, centerY) * 0.65;

    this.nodes = graphData.nodes.map((n, i) => {
      const angle = (i / count) * 2 * Math.PI;
      return {
        ...n,
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: n.size || 24
      };
    });

    this.links = graphData.links.map(l => ({ ...l }));
  },

  resizeCanvas() {
    const wrapper = this.container.querySelector('#graph-wrapper');
    if (wrapper && this.canvas) {
      this.canvas.width = wrapper.clientWidth;
      this.canvas.height = wrapper.clientHeight;
    }
  },

  bindCanvasEvents() {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // Zoom buttons
    this.container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      this.scale = Math.min(this.scale * 1.25, 3);
    });
    this.container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      this.scale = Math.max(this.scale * 0.8, 0.4);
    });
    this.container.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      this.scale = 1;
      this.panX = 0;
      this.panY = 0;
    });

    // MOUSE EVENTS
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.panX) / this.scale;
      const mouseY = (e.clientY - rect.top - this.panY) / this.scale;

      // Detectar si se hizo clic en un nodo
      const clickedNode = this.findNodeAt(mouseX, mouseY);

      if (clickedNode) {
        this.draggedNode = clickedNode;
        this.selectNode(clickedNode);
      } else {
        this.isDragging = true;
        this.startMouseX = e.clientX - this.panX;
        this.startMouseY = e.clientY - this.panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.draggedNode) {
        const rect = this.canvas.getBoundingClientRect();
        this.draggedNode.x = (e.clientX - rect.left - this.panX) / this.scale;
        this.draggedNode.y = (e.clientY - rect.top - this.panY) / this.scale;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      } else if (this.isDragging) {
        this.panX = e.clientX - this.startMouseX;
        this.panY = e.clientY - this.startMouseY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.draggedNode = null;
      this.isDragging = false;
    });

    // Rueda del ratón para zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.scale = Math.max(0.4, Math.min(3, this.scale * zoomFactor));
    }, { passive: false });
  },

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= node.radius + 6) {
        return node;
      }
    }
    return null;
  },

  selectNode(node) {
    this.selectedNode = node;
    const inspector = this.container.querySelector('#graph-inspector');
    if (!inspector) return;

    // Encontrar conexiones de este nodo
    const connectedLinks = this.links.filter(l => l.source === node.id || l.target === node.id);
    const connectedNodeIds = new Set();
    connectedLinks.forEach(l => {
      if (l.source === node.id) connectedNodeIds.add(l.target);
      if (l.target === node.id) connectedNodeIds.add(l.source);
    });

    const connectedNodes = this.nodes.filter(n => connectedNodeIds.has(n.id));

    inspector.classList.remove('hidden');
    inspector.innerHTML = `
      <div class="inspector-header">
        <div>
          <span class="topic-subject-badge ${node.subject}" style="margin-bottom: 6px;">
            ${node.category || node.subject}
          </span>
          <h2 class="inspector-node-title">${node.label}</h2>
        </div>
        <button class="icon-btn btn-sm" id="btn-close-inspector" aria-label="Cerrar">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="inspector-section">
        <span class="inspector-section-label">Definición y Rol en el Grado</span>
        <p class="inspector-description">${node.desc || 'Institución fundamental para la comprensión y resolución de casos.'}</p>
      </div>

      <div class="inspector-section">
        <span class="inspector-section-label">Instituciones Vinculadas y Nexos Dogmáticos (${connectedNodes.length})</span>
        <div class="connected-nodes-pills" style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          ${connectedNodes.map(cn => {
            const link = this.links.find(l => (l.source === node.id && l.target === cn.id) || (l.source === cn.id && l.target === node.id));
            const linkDesc = link ? link.label : '';
            return `
            <div class="connected-pill-row" data-target-node="${cn.id}" style="padding: 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; transition: var(--transition-fast);">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <strong style="font-size: 0.82rem; color: var(--text-main);">${cn.label}</strong>
                <span class="topic-subject-badge ${cn.subject}" style="font-size: 0.65rem; padding: 2px 6px;">${cn.subject}</span>
              </div>
              ${linkDesc ? `<div style="font-size: 0.74rem; color: var(--gold-primary); margin-top: 4px; display: flex; align-items: center; gap: 4px;"><i data-lucide="git-commit" style="width: 12px; height: 12px;"></i><span>Nexo: ${linkDesc}</span></div>` : ''}
            </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="inspector-section" style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
        <button class="btn btn-primary" id="btn-view-node-topic" style="width: 100%;">
          <i data-lucide="book-open"></i>
          <span>Buscar en Temario</span>
        </button>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Cerrar inspector
    inspector.querySelector('#btn-close-inspector')?.addEventListener('click', () => {
      inspector.classList.add('hidden');
      this.selectedNode = null;
    });

    // Clic en instituciones vinculadas
    inspector.querySelectorAll('[data-target-node]').forEach(pill => {
      pill.addEventListener('click', () => {
        const targetId = pill.dataset.targetNode;
        const targetNode = this.nodes.find(n => n.id === targetId);
        if (targetNode) {
          this.selectNode(targetNode);
        }
      });
    });

    // Botón ir al temario
    inspector.querySelector('#btn-view-node-topic')?.addEventListener('click', () => {
      App.switchView('topics');
      App.searchGlobal(node.label);
    });
  },

  startSimulation() {
    const simulate = () => {
      this.updatePhysics();
      this.draw();
      this.animationId = requestAnimationFrame(simulate);
    };
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = requestAnimationFrame(simulate);
  },

  updatePhysics() {
    const kRepel = 2200;
    const kSpring = 0.04;
    const centerStrength = 0.015;
    const damping = 0.88;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Repulsión entre nodos
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        let dist = Math.hypot(dx, dy) || 1;
        if (dist < 320) {
          const force = kRepel / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // Fuerza de resortes en las aristas (links)
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.links.forEach(link => {
      const a = nodeMap.get(link.source);
      const b = nodeMap.get(link.target);
      if (a && b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const targetDist = 140;
        const displacement = dist - targetDist;
        const force = displacement * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    });

    // Gravedad hacia el centro y actualización de posiciones
    this.nodes.forEach(n => {
      if (n === this.draggedNode) return;
      n.vx += (centerX - n.x) * centerStrength;
      n.vy += (centerY - n.y) * centerStrength;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    });
  },

  draw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    // 1. Dibujar enlaces (aristas)
    ctx.lineWidth = 1.5;
    this.links.forEach(l => {
      const a = nodeMap.get(l.source);
      const b = nodeMap.get(l.target);
      if (a && b) {
        const isHighlighted = this.selectedNode && (this.selectedNode.id === a.id || this.selectedNode.id === b.id);
        ctx.strokeStyle = isHighlighted ? 'rgba(212, 175, 55, 0.8)' : 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Si está destacado, dibujar texto del enlace
        if (isHighlighted && l.label) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          ctx.fillStyle = '#d4af37';
          ctx.font = '10px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(l.label, midX, midY - 4);
        }
      }
    });

    // 2. Dibujar Nodos
    this.nodes.forEach(n => {
      const isSelected = this.selectedNode && this.selectedNode.id === n.id;

      // Color según materia
      let fillColor = '#38bdf8'; // civil
      if (n.subject === 'procesal') fillColor = '#a855f7';
      if (n.subject === 'constitucional') fillColor = '#f59e0b';
      if (n.subject === 'cross') fillColor = '#d4af37';

      // Halo si está seleccionado
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.fill();
      }

      // Círculo principal del nodo
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)';
      ctx.stroke();

      // Etiqueta del nodo
      ctx.fillStyle = isSelected ? '#ffffff' : '#edf2f7';
      ctx.font = `${isSelected ? 'bold 12px' : '11px'} Plus Jakarta Sans, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, n.x, n.y + n.radius + 5);
    });

    ctx.restore();
  }
};
