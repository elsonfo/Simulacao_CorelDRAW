const svg = document.getElementById("stage");
const drawingLayer = document.getElementById("drawingLayer");
const selectionBox = document.getElementById("selectionBox");
const gridLayer = document.getElementById("gridLayer");
const statusText = document.getElementById("statusText");
const objectCount = document.getElementById("objectCount");
const layers = document.getElementById("layers");
const fillColor = document.getElementById("fillColor");
const strokeColor = document.getElementById("strokeColor");
const strokeWidth = document.getElementById("strokeWidth");
const fontSize = document.getElementById("fontSize");
const projectName = document.getElementById("projectName");
const fileInput = document.getElementById("fileInput");

const SVG_NS = "http://www.w3.org/2000/svg";
const lessons = [
  "Selecionar e mover objetos com precisão.",
  "Criar retângulos e elipses para montar ícones.",
  "Aplicar preenchimento, contorno e espessura.",
  "Inserir texto e ajustar tamanho para um cartaz.",
  "Organizar camadas, duplicar e exportar o projeto."
];

let currentTool = "select";
let selected = null;
let currentShape = null;
let dragStart = null;
let isDrawing = false;
let lessonIndex = 0;

function setStatus(message) {
  statusText.textContent = message;
}

function makeSvgElement(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function pointerPoint(event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function snap(value) {
  return Math.round(value / 8) * 8;
}

function styleAttrs() {
  return {
    fill: fillColor.value,
    stroke: strokeColor.value,
    "stroke-width": strokeWidth.value,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  };
}

function nextId() {
  return `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function objectName(node) {
  const names = {
    rect: "Retângulo",
    ellipse: "Elipse",
    line: "Linha",
    path: "Livre",
    text: "Texto"
  };
  return names[node.tagName] || "Objeto";
}

function selectNode(node) {
  selected = node && node.parentNode === drawingLayer ? node : null;
  updateSelectionBox();
  updateLayers();
  setStatus(selected ? `${objectName(selected)} selecionado.` : "Nenhum objeto selecionado.");
}

function updateSelectionBox() {
  if (!selected) {
    selectionBox.hidden = true;
    return;
  }
  const box = selected.getBoundingClientRect();
  const topLeft = screenToSvg(box.left, box.top);
  const bottomRight = screenToSvg(box.right, box.bottom);
  selectionBox.setAttribute("x", topLeft.x - 6);
  selectionBox.setAttribute("y", topLeft.y - 6);
  selectionBox.setAttribute("width", bottomRight.x - topLeft.x + 12);
  selectionBox.setAttribute("height", bottomRight.y - topLeft.y + 12);
  selectionBox.hidden = false;
}

function screenToSvg(x, y) {
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function updateCount() {
  const total = drawingLayer.children.length;
  objectCount.textContent = `${total} ${total === 1 ? "objeto" : "objetos"}`;
}

function updateLayers() {
  layers.innerHTML = "";
  [...drawingLayer.children].reverse().forEach((node, index) => {
    const row = document.createElement("button");
    row.className = `layer-row${node === selected ? " active" : ""}`;
    row.innerHTML = `<span class="layer-chip" style="background:${node.getAttribute("fill") || node.getAttribute("stroke") || "#fff"}"></span><span>${objectName(node)} ${drawingLayer.children.length - index}</span>`;
    row.addEventListener("click", () => selectNode(node));
    layers.appendChild(row);
  });
  updateCount();
}

function renderLessons() {
  const list = document.getElementById("lessonList");
  list.innerHTML = "";
  lessons.forEach((lesson, index) => {
    const item = document.createElement("li");
    item.textContent = lesson;
    item.className = index === lessonIndex ? "active" : "";
    list.appendChild(item);
  });
}

function addNode(node) {
  node.dataset.id = nextId();
  drawingLayer.appendChild(node);
  selectNode(node);
}

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll(".tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  setStatus(`Ferramenta: ${document.querySelector(`[data-tool="${tool}"]`).title}.`);
}

function createShape(tool, point) {
  const common = styleAttrs();
  if (tool === "rect") {
    return makeSvgElement("rect", { x: point.x, y: point.y, width: 1, height: 1, rx: 0, ...common });
  }
  if (tool === "ellipse") {
    return makeSvgElement("ellipse", { cx: point.x, cy: point.y, rx: 1, ry: 1, ...common });
  }
  if (tool === "line") {
    return makeSvgElement("line", { x1: point.x, y1: point.y, x2: point.x, y2: point.y, fill: "none", stroke: common.stroke, "stroke-width": common["stroke-width"], "stroke-linecap": "round" });
  }
  if (tool === "pen") {
    return makeSvgElement("path", { d: `M ${point.x} ${point.y}`, fill: "none", stroke: common.stroke, "stroke-width": common["stroke-width"], "stroke-linecap": "round", "stroke-linejoin": "round" });
  }
  return null;
}

function updateShape(node, start, point) {
  const x = Math.min(start.x, point.x);
  const y = Math.min(start.y, point.y);
  const width = Math.abs(point.x - start.x);
  const height = Math.abs(point.y - start.y);
  if (node.tagName === "rect") {
    node.setAttribute("x", x);
    node.setAttribute("y", y);
    node.setAttribute("width", width);
    node.setAttribute("height", height);
  } else if (node.tagName === "ellipse") {
    node.setAttribute("cx", x + width / 2);
    node.setAttribute("cy", y + height / 2);
    node.setAttribute("rx", width / 2);
    node.setAttribute("ry", height / 2);
  } else if (node.tagName === "line") {
    node.setAttribute("x2", point.x);
    node.setAttribute("y2", point.y);
  } else if (node.tagName === "path") {
    node.setAttribute("d", `${node.getAttribute("d")} L ${point.x} ${point.y}`);
  }
}

function moveNode(node, dx, dy) {
  const current = node.transform.baseVal.consolidate();
  const matrix = current ? current.matrix : svg.createSVGMatrix();
  const transform = svg.createSVGTransform();
  transform.setMatrix(matrix.translate(dx, dy));
  node.transform.baseVal.initialize(transform);
}

function applyCurrentStyle() {
  if (!selected) return;
  if (selected.tagName !== "line" && selected.tagName !== "path") {
    selected.setAttribute("fill", fillColor.value);
  }
  selected.setAttribute("stroke", strokeColor.value);
  selected.setAttribute("stroke-width", strokeWidth.value);
  if (selected.tagName === "text") {
    selected.setAttribute("font-size", fontSize.value);
  }
  updateSelectionBox();
  updateLayers();
}

function addText(point) {
  const text = prompt("Digite o texto:", "Meu cartaz");
  if (!text) return;
  const node = makeSvgElement("text", {
    x: snap(point.x),
    y: snap(point.y),
    fill: fillColor.value,
    stroke: "none",
    "font-size": fontSize.value,
    "font-family": "Arial, Helvetica, sans-serif",
    "font-weight": "700"
  });
  node.textContent = text;
  addNode(node);
}

svg.addEventListener("pointerdown", (event) => {
  const point = pointerPoint(event);
  if (event.target.parentNode === drawingLayer && currentTool === "select") {
    selectNode(event.target);
    dragStart = point;
    isDrawing = true;
    return;
  }
  if (currentTool === "select") {
    selectNode(null);
    return;
  }
  if (currentTool === "text") {
    addText(point);
    return;
  }
  dragStart = { x: snap(point.x), y: snap(point.y) };
  currentShape = createShape(currentTool, dragStart);
  addNode(currentShape);
  isDrawing = true;
});

svg.addEventListener("pointermove", (event) => {
  if (!isDrawing || !dragStart) return;
  const point = pointerPoint(event);
  const snapped = { x: snap(point.x), y: snap(point.y) };
  if (currentTool === "select" && selected) {
    moveNode(selected, snapped.x - dragStart.x, snapped.y - dragStart.y);
    dragStart = snapped;
    updateSelectionBox();
    return;
  }
  if (currentShape) {
    updateShape(currentShape, dragStart, snapped);
    updateSelectionBox();
  }
});

svg.addEventListener("pointerup", () => {
  isDrawing = false;
  currentShape = null;
  dragStart = null;
  updateLayers();
});

drawingLayer.addEventListener("click", (event) => {
  if (currentTool === "select") {
    selectNode(event.target);
  }
});

document.querySelectorAll(".tool").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

[fillColor, strokeColor, strokeWidth, fontSize].forEach((input) => {
  input.addEventListener("input", applyCurrentStyle);
});

document.getElementById("duplicateBtn").addEventListener("click", () => {
  if (!selected) return;
  const clone = selected.cloneNode(true);
  moveNode(clone, 24, 24);
  addNode(clone);
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  if (!selected) return;
  selected.remove();
  selectNode(null);
});

document.getElementById("frontBtn").addEventListener("click", () => {
  if (!selected) return;
  drawingLayer.appendChild(selected);
  updateLayers();
});

document.getElementById("backBtn").addEventListener("click", () => {
  if (!selected) return;
  drawingLayer.insertBefore(selected, drawingLayer.firstChild);
  updateLayers();
});

document.getElementById("gridBtn").addEventListener("click", (event) => {
  gridLayer.hidden = !gridLayer.hidden;
  event.currentTarget.classList.toggle("active", !gridLayer.hidden);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("Limpar todos os objetos da página?")) return;
  drawingLayer.innerHTML = "";
  selectNode(null);
});

document.getElementById("nextLessonBtn").addEventListener("click", () => {
  lessonIndex = (lessonIndex + 1) % lessons.length;
  renderLessons();
});

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.getElementById("saveBtn").addEventListener("click", () => {
  const data = {
    name: projectName.value,
    objects: drawingLayer.innerHTML,
    lessonIndex
  };
  download(`${projectName.value || "projeto"}.json`, JSON.stringify(data, null, 2), "application/json");
});

document.getElementById("loadBtn").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const data = JSON.parse(await file.text());
  projectName.value = data.name || "Projeto";
  drawingLayer.innerHTML = data.objects || "";
  lessonIndex = data.lessonIndex || 0;
  selectNode(null);
  renderLessons();
});

document.getElementById("exportSvgBtn").addEventListener("click", () => {
  const clone = svg.cloneNode(true);
  clone.querySelector("#selectionBox").remove();
  clone.querySelector("#gridLayer").remove();
  const source = `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
  download(`${projectName.value || "desenho"}.svg`, source, "image/svg+xml");
});

document.getElementById("exportPngBtn").addEventListener("click", () => {
  const clone = svg.cloneNode(true);
  clone.querySelector("#selectionBox").remove();
  clone.querySelector("#gridLayer").remove();
  const source = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 620;
  img.onload = () => {
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${projectName.value || "desenho"}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Delete" || event.key === "Backspace") {
    document.getElementById("deleteBtn").click();
  }
  if (event.ctrlKey && event.key.toLowerCase() === "d") {
    event.preventDefault();
    document.getElementById("duplicateBtn").click();
  }
});

renderLessons();
updateLayers();
