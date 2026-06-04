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
const objectScale = document.getElementById("objectScale");
const objectHeight = document.getElementById("objectHeight");
const objectRotation = document.getElementById("objectRotation");
const projectName = document.getElementById("projectName");
const fileInput = document.getElementById("fileInput");

const SVG_NS = "http://www.w3.org/2000/svg";
const lessons = [
  "Inserir um modelo de roupa e mover na prancheta.",
  "Trocar preenchimento e contorno para testar combinações.",
  "Adicionar texto com nome da turma ou da marca.",
  "Duplicar detalhes, etiquetas e formas decorativas.",
  "Exportar o desenho final em PNG ou SVG."
];

let currentTool = "select";
let selected = null;
let currentShape = null;
let dragStart = null;
let isDrawing = false;
let lessonIndex = 0;
let isSyncingControls = false;

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
    text: "Texto",
    g: node.dataset.name || "Modelo"
  };
  return names[node.tagName] || "Objeto";
}

function directDrawingObject(node) {
  let current = node;
  while (current && current !== svg) {
    if (current.parentNode === drawingLayer) return current;
    current = current.parentNode;
  }
  return null;
}

function selectNode(node) {
  selected = node ? directDrawingObject(node) : null;
  if (selected) initObjectTransform(selected);
  updateSelectionBox();
  updateLayers();
  syncTransformControls();
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
  initObjectTransform(node);
  selectNode(node);
}

function initObjectTransform(node) {
  if (!node.dataset.x) node.dataset.x = "0";
  if (!node.dataset.y) node.dataset.y = "0";
  if (!node.dataset.scale) node.dataset.scale = "1";
  if (!node.dataset.heightScale) node.dataset.heightScale = "1";
  if (!node.dataset.rotation) node.dataset.rotation = "0";
  setObjectTransform(node);
}

function objectTransformData(node) {
  return {
    x: Number(node.dataset.x || 0),
    y: Number(node.dataset.y || 0),
    scale: Number(node.dataset.scale || 1),
    heightScale: Number(node.dataset.heightScale || 1),
    rotation: Number(node.dataset.rotation || 0)
  };
}

function objectCenter(node) {
  const box = node.getBBox();
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

function setObjectTransform(node) {
  const data = objectTransformData(node);
  const center = objectCenter(node);
  const scaleY = data.scale * data.heightScale;
  node.setAttribute(
    "transform",
    `translate(${data.x} ${data.y}) rotate(${data.rotation} ${center.x} ${center.y}) translate(${center.x} ${center.y}) scale(${data.scale} ${scaleY}) translate(${-center.x} ${-center.y})`
  );
}

function syncTransformControls() {
  isSyncingControls = true;
  if (!selected) {
    objectScale.value = 100;
    objectHeight.value = 100;
    objectRotation.value = 0;
  } else {
    const data = objectTransformData(selected);
    objectScale.value = Math.round(data.scale * 100);
    objectHeight.value = Math.round(data.heightScale * 100);
    objectRotation.value = Math.round(data.rotation);
  }
  isSyncingControls = false;
}

function applyTransformControls() {
  if (!selected || isSyncingControls) return;
  selected.dataset.scale = String(Number(objectScale.value) / 100);
  selected.dataset.heightScale = String(Number(objectHeight.value) / 100);
  selected.dataset.rotation = objectRotation.value;
  setObjectTransform(selected);
  updateSelectionBox();
  updateLayers();
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
  initObjectTransform(node);
  node.dataset.x = String(Number(node.dataset.x || 0) + dx);
  node.dataset.y = String(Number(node.dataset.y || 0) + dy);
  setObjectTransform(node);
}

function applyCurrentStyle() {
  if (!selected) return;
  if (selected.tagName === "g") {
    selected.querySelectorAll("[data-colorable~='fill']").forEach((node) => {
      node.setAttribute("fill", fillColor.value);
    });
    selected.querySelectorAll("[data-colorable~='stroke']").forEach((node) => {
      node.setAttribute("stroke", strokeColor.value);
      node.setAttribute("stroke-width", strokeWidth.value);
    });
    updateSelectionBox();
    updateLayers();
    return;
  }
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

function addTemplate(type) {
  const group = makeSvgElement("g", {
    "data-name": templateName(type)
  });
  group.dataset.x = "300";
  group.dataset.y = "110";
  templateParts(type).forEach((part) => group.appendChild(part));
  addNode(group);
  setTool("select");
  setStatus(`${templateName(type)} inserido. Use as cores para personalizar.`);
}

function templateName(type) {
  const names = {
    shirt: "Camiseta",
    dress: "Vestido",
    pants: "Calça",
    skirt: "Saia",
    body: "Corpo guia",
    label: "Etiqueta"
  };
  return names[type] || "Modelo";
}

function templatePath(d, fill = fillColor.value, stroke = strokeColor.value, colorable) {
  return makeSvgElement("path", {
    d,
    fill,
    stroke,
    "stroke-width": strokeWidth.value,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
    "data-colorable": colorable || (fill === "none" ? "stroke" : "fill stroke")
  });
}

function templateLine(x1, y1, x2, y2, dashed = false) {
  const line = makeSvgElement("line", {
    x1,
    y1,
    x2,
    y2,
    stroke: strokeColor.value,
    "stroke-width": Math.max(1, Number(strokeWidth.value) - 1),
    "stroke-linecap": "round",
    "data-colorable": "stroke"
  });
  if (dashed) line.setAttribute("stroke-dasharray", "8 7");
  return line;
}

function templateText(text, x, y, size = 24) {
  const node = makeSvgElement("text", {
    x,
    y,
    fill: strokeColor.value,
    stroke: "none",
    "font-size": size,
    "font-family": "Arial, Helvetica, sans-serif",
    "font-weight": "700",
    "text-anchor": "middle",
    "data-colorable": "fill"
  });
  node.textContent = text;
  return node;
}

function templateParts(type) {
  if (type === "shirt") {
    return [
      templatePath("M120 38 L176 64 L214 118 L176 146 L160 116 L160 264 L64 264 L64 116 L48 146 L10 118 L48 64 Z"),
      templatePath("M88 38 Q112 72 144 38", "#ffffff", strokeColor.value, "stroke"),
      templateLine(64, 116, 160, 116),
      templateLine(88, 264, 88, 174, true),
      templateLine(136, 264, 136, 174, true)
    ];
  }
  if (type === "dress") {
    return [
      templatePath("M96 34 L146 34 L172 102 L202 276 L40 276 L70 102 Z"),
      templatePath("M100 34 Q120 64 142 34", "#ffffff", strokeColor.value, "stroke"),
      templateLine(70, 102, 172, 102),
      templateLine(88, 124, 62, 276, true),
      templateLine(154, 124, 180, 276, true)
    ];
  }
  if (type === "pants") {
    return [
      templatePath("M70 38 L166 38 L184 286 L128 286 L118 130 L106 286 L50 286 Z"),
      templateLine(70, 84, 166, 84),
      templateLine(118, 130, 118, 286),
      templateLine(84, 38, 84, 84, true),
      templateLine(152, 38, 152, 84, true)
    ];
  }
  if (type === "skirt") {
    return [
      templatePath("M72 44 L168 44 L206 250 L34 250 Z"),
      templateLine(72, 44, 168, 44),
      templateLine(94, 70, 66, 250, true),
      templateLine(120, 70, 120, 250, true),
      templateLine(146, 70, 174, 250, true)
    ];
  }
  if (type === "body") {
    return [
      makeSvgElement("ellipse", { cx: 118, cy: 34, rx: 26, ry: 30, fill: "none", stroke: strokeColor.value, "stroke-width": 3, "data-colorable": "stroke" }),
      templateLine(118, 64, 118, 190, true),
      templateLine(64, 98, 172, 98, true),
      templateLine(82, 190, 154, 190, true),
      templateLine(64, 98, 42, 172, true),
      templateLine(172, 98, 194, 172, true),
      templateLine(98, 190, 86, 286, true),
      templateLine(138, 190, 150, 286, true)
    ];
  }
  return [
    makeSvgElement("rect", { x: 48, y: 72, width: 160, height: 96, rx: 8, fill: fillColor.value, stroke: strokeColor.value, "stroke-width": strokeWidth.value, "data-colorable": "fill stroke" }),
    templateText("MINHA MARCA", 128, 128, 20),
    templateLine(70, 148, 186, 148)
  ];
}

svg.addEventListener("pointerdown", (event) => {
  const point = pointerPoint(event);
  const targetObject = directDrawingObject(event.target);
  if (targetObject && currentTool === "select") {
    selectNode(targetObject);
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

[objectScale, objectHeight, objectRotation].forEach((input) => {
  input.addEventListener("input", applyTransformControls);
});

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => addTemplate(button.dataset.template));
});

document.getElementById("duplicateBtn").addEventListener("click", () => {
  if (!selected) return;
  const clone = selected.cloneNode(true);
  addNode(clone);
  moveNode(clone, 24, 24);
  selectNode(clone);
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

function rotateSelectedBy(degrees) {
  if (!selected) return;
  const current = Number(selected.dataset.rotation || 0);
  const next = Math.max(-180, Math.min(180, current + degrees));
  selected.dataset.rotation = String(next);
  setObjectTransform(selected);
  syncTransformControls();
  updateSelectionBox();
}

document.getElementById("rotateLeftBtn").addEventListener("click", () => rotateSelectedBy(-15));
document.getElementById("rotateRightBtn").addEventListener("click", () => rotateSelectedBy(15));

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
