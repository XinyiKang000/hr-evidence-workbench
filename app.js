"use strict";

const get = id => document.getElementById(id);
const criteria = get("criteria");
const resume = get("resume");
const raw = get("raw");
const output = get("output");
const download = get("download");
const live = get("live");
let activeCase = 0;
let currentRows = [];
let revision = 0;
const checked = new Set();

function node(tag, content, cssClass) {
  const element = document.createElement(tag);
  element.textContent = content;
  if (cssClass) element.className = cssClass;
  return element;
}

function tell(message, error = false) {
  get("message").textContent = message;
  get("message").classList.toggle("error", error);
}

function clearResult(note = "等待校验") {
  revision += 1;
  currentRows = [];
  checked.clear();
  download.disabled = true;
  get("source").textContent = note;
  output.replaceChildren(node("p", "回放样例或导入模型结果，生成可复核的提纲。", "empty"));
}

function showResult(value, source) {
  clearResult(source);
  try {
    const { rows, issues } = validateOutput(value, readInputs(criteria.value, resume.value));
    currentRows = rows;
    output.replaceChildren(...rows.map((row, index) => {
      const card = node("article", "", "card");
      const title = node("div", "", "card-title");
      title.append(node("h3", row.criterion), node("span", STATUS_LABELS[row.status], "status " + row.status));
      card.append(title);
      if (row.quote) card.append(node("blockquote", row.quote));
      if (row.reason) {
        card.append(node("p", row.reason));
        return card;
      }
      card.append(node("p", row.question));
      const label = node("label", "");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.addEventListener("change", () => {
        if (box.checked) checked.add(index);
        else checked.delete(index);
        download.disabled = checked.size === 0;
      });
      label.append(box, "确认纳入提纲");
      card.append(label);
      return card;
    }));
    const rejected = rows.filter(row => row.status === "reject").length;
    tell(`已校验 ${rows.length} 项，拦截 ${rejected} 项。${issues ? `忽略 ${issues} 条未知能力。` : ""}`, Boolean(rejected || issues));
  } catch (error) {
    clearResult("校验未完成");
    tell(error.message, true);
  }
}

function replay() {
  const sample = demoCases[activeCase];
  if (criteria.value !== sample.criteria.join("\n") || resume.value !== sample.material) {
    tell("材料已修改。请导入对应的模型输出，或重新点击案例恢复原始材料。", true);
    return;
  }
  raw.value = JSON.stringify({ rows: sample.rows }, null, 2);
  showResult(raw.value, activeCase === 2 ? "异常回放 · 含一条故意植入的无来源引文" : "样例回放 · ChatGPT 生成的预置输出");
}

function selectCase(index) {
  activeCase = index;
  const sample = demoCases[index];
  criteria.value = sample.criteria.join("\n");
  resume.value = sample.material;
  Array.from(get("cases").children).forEach((item, position) => {
    item.setAttribute("aria-pressed", String(position === index));
  });
  replay();
}

demoCases.forEach((sample, index) => {
  const button = node("button", sample.label);
  button.type = "button";
  button.addEventListener("click", () => selectCase(index));
  get("cases").append(button);
});
selectCase(0);

[criteria, resume, raw].forEach(field => field.addEventListener("input", () => {
  clearResult("输入已更新，请重新校验。");
  tell("");
}));

get("example").addEventListener("click", replay);
get("review").addEventListener("click", () => showResult(raw.value, "手动导入 · 可逐项复核"));
get("copy").addEventListener("click", async () => {
  try {
    const prompt = makePrompt(readInputs(criteria.value, resume.value));
    try {
      await navigator.clipboard.writeText(prompt);
      tell("提示词已复制。发送给模型后，将 JSON 粘贴到导入框。");
    } catch {
      get("import").open = true;
      raw.value = prompt;
      clearResult();
      raw.focus();
      raw.select();
      tell("请手动复制选中的提示词，用模型返回的 JSON 替换它。");
    }
  } catch (error) {
    tell(error.message, true);
  }
});

download.addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([makeOutline(currentRows, checked)], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "interview-outline.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  fetch("api/status")
    .then(response => response.json())
    .then(status => { live.hidden = !status.ready; })
    .catch(() => {});
}

live.addEventListener("click", async () => {
  let prompt;
  try {
    prompt = makePrompt(readInputs(criteria.value, resume.value));
  } catch (error) {
    tell(error.message, true);
    return;
  }
  if (!window.confirm("将把当前岗位能力和候选人材料发送给 OpenAI。请确认材料是虚构或已获授权。")) return;
  clearResult("模型生成中");
  const requestRevision = revision;
  live.disabled = true;
  tell("正在生成初筛提纲…");
  try {
    const response = await fetch("api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "模型请求失败。");
    if (revision !== requestRevision) return;
    raw.value = result.text;
    showResult(result.text, `OpenAI 模型输出 · ${result.model}`);
  } catch (error) {
    if (revision === requestRevision) {
      clearResult("模型请求未完成");
      tell(error.message, true);
    }
  } finally {
    live.disabled = false;
  }
});
