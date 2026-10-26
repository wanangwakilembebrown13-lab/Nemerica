// --- 1. PARSER & SAFE EVALUATION ---
function parseToJS(expr) {
    if (!expr) return "";
    expr = expr.replace(/\^/g, "**");
    expr = expr.replace(/\\sin/g, "Math.sin").replace(/\\cos/g, "Math.cos")
               .replace(/\\tan/g, "Math.tan").replace(/\\exp/g, "Math.exp")
               .replace(/\\ln/g, "Math.log").replace(/\\log/g, "Math.log10")
               .replace(/\\sqrt/g, "Math.sqrt").replace(/\\pi/g, "Math.PI");
    expr = expr.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
    return expr;
}

// Returns null for invalid math (used for graphing so it doesn't crash on asymptotes)
function safeEval(expr, x) {
    try {
        const func = new Function("x", `return ${expr};`);
        const result = func(x);
        if (isNaN(result) || !isFinite(result)) return null; 
        return result;
    } catch (e) {
        return null;
    }
}

// Throws errors (used for calculations to stop the loop if something goes wrong)
function safeEvalStrict(expr, x) {
    try {
        const func = new Function("x", `return ${expr};`);
        const result = func(x);
        if (isNaN(result)) throw new Error("Math Domain Error");
        if (!isFinite(result)) throw new Error("Diverged to Infinity");
        return result;
    } catch (e) {
        throw new Error("Invalid Math format");
    }
}

// --- 2. THEME & STATE MANAGEMENT ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? "☀️" : "🌙";
    localStorage.setItem('nemerica_theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    const theme = localStorage.getItem('nemerica_theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerText = "☀️";
    }
}

function saveState() {
    const state = {
        f: document.getElementById("func_f").value,
        g: document.getElementById("func_g").value,
        method: document.getElementById("method").value,
        p0: document.getElementById("p0").value,
        p1: document.getElementById("p1").value,
        a: document.getElementById("a").value,
        b: document.getElementById("b").value,
        tol: document.getElementById("tol").value
    };
    localStorage.setItem('nemerica_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('nemerica_state');
    if (saved) {
        const state = JSON.parse(saved);
        document.getElementById("func_f").value = state.f || "";
        document.getElementById("func_g").value = state.g || "";
        document.getElementById("method").value = state.method || "newton";
        document.getElementById("p0").value = state.p0 || "1.0";
        document.getElementById("p1").value = state.p1 || "2.0";
        document.getElementById("a").value = state.a || "1.0";
        document.getElementById("b").value = state.b || "2.0";
        document.getElementById("tol").value = state.tol || "";
        updateInputs();
        updatePreview('func_f', 'preview_f');
        if(state.g) updatePreview('func_g', 'preview_g');
    }
}

// --- 3. KATEX MATH RENDERING ---
function updatePreview(inputId, previewId) {
    const rawInput = document.getElementById(inputId).value;
    const previewDiv = document.getElementById(previewId);
    if (!rawInput.trim()) { previewDiv.innerHTML = ""; return; }
    let latexStr = rawInput.replace(/\*/g, " \\cdot ").replace(/sqrt/g, "\\sqrt"); 
    try {
        katex.render(latexStr, previewDiv, { throwOnError: false, displayMode: true });
    } catch (e) {
        previewDiv.innerHTML = rawInput;
    }
}

// --- 4. EXAMPLES ---
function loadExample(exId) {
    if (!exId) return;
    document.getElementById("func_f").value = "";
    document.getElementById("func_g").value = "";
    document.getElementById("preview_f").innerHTML = "";
    document.getElementById("preview_g").innerHTML = "";

    if (exId === 'ex1') {
        document.getElementById("func_f").value = "x - \\cos(x)";
        document.getElementById("method").value = "newton";
        document.getElementById("p0").value = "1.0";
    } else if (exId === 'ex2') {
        document.getElementById("func_f").value = "x^3 - x - 1";
        document.getElementById("func_g").value = "(x + 1)^(1/3)";
        document.getElementById("method").value = "fixed";
        document.getElementById("p0").value = "1.0";
    } else if (exId === 'ex3') {
        document.getElementById("func_f").value = "x^3 - 2x - 5";
        document.getElementById("method").value = "bisection";
        document.getElementById("a").value = "2.0";
        document.getElementById("b").value = "3.0";
    }
    updateInputs();
    updatePreview('func_f', 'preview_f');
    if(document.getElementById("func_g").value) updatePreview('func_g', 'preview_g');
    saveState();
}

// --- 5. UI LOGIC ---
function updateInputs() {
    const method = document.getElementById("method").value;
    document.getElementById("g_box").classList.add("hidden");
    document.getElementById("p0_box").classList.add("hidden");
    document.getElementById("p1_box").classList.add("hidden");
    document.getElementById("interval_box").classList.add("hidden");

    if (method === "fixed" || method === "aitken" || method === "steffensen") {
        document.getElementById("g_box").classList.remove("hidden");
        document.getElementById("p0_box").classList.remove("hidden");
    } else if (method === "newton") {
        document.getElementById("p0_box").classList.remove("hidden");
    } else if (method === "secant") {
        document.getElementById("p0_box").classList.remove("hidden");
        document.getElementById("p1_box").classList.remove("hidden");
    } else if (method === "bisection") {
        document.getElementById("interval_box").classList.remove("hidden");
    }
}

function addRow(iter, p, f_val, err) {
    const tbody = document.querySelector("#result_table tbody");
    const tr = document.createElement("tr");
    let fStr = (f_val === null || Math.abs(f_val) < 1e-14) ? "0.000000" : f_val.toFixed(6);
    tr.innerHTML = `<td>${iter}</td><td>${p.toFixed(6)}</td><td>${fStr}</td><td>${err.toFixed(6)}</td>`;
    tbody.appendChild(tr);
}

function setupTable(title, msg, isError = false) {
    document.getElementById("results").classList.remove("hidden");
    document.getElementById("result_title").innerText = title;
    const msgBox = document.getElementById("message");
    msgBox.className = isError ? "error" : "success";
    msgBox.innerText = msg;
    if (!isError && !msg) msgBox.classList.add("hidden"); 
    document.querySelector("#result_table tbody").innerHTML = "";
}

// --- 6. GRAPHING ENGINE ---
let chartInstance = null;

function renderGraph(exprF, root, p0, a, b) {
    const ctx = document.getElementById('graphCanvas').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    let center = root !== null ? root : (p0 !== null ? p0 : (a !== null ? a : 0));
    let range = 2; 
    let minX = center - range;
    let maxX = center + range;

    const dataPoints = [];
    const steps = 150; 
    const stepSize = (maxX - minX) / steps;

    for (let x = minX; x <= maxX; x += stepSize) {
        let y = safeEval(exprF, x);
        if (y !== null && Math.abs(y) < 1000) { 
            dataPoints.push({ x: x, y: y });
        } else {
            dataPoints.push({ x: x, y: null });
        }
    }

    const rootData = root !== null ? [{ x: root, y: 0 }] : [];
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'f(x)',
                    data: dataPoints,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Root',
                    data: rootData,
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: { color: gridColor },
                    ticks: { color: textColor, maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, maxTicksLimit: 8 }
                }
            }
        }
    });
}

// --- 7. MATH ALGORITHMS ---
function calculate() {
    saveState();
    const method = document.getElementById("method").value;
    const exprF = parseToJS(document.getElementById("func_f").value);
    let tolInput = document.getElementById("tol").value;
    const tol = tolInput ? parseFloat(tolInput) : 0.01;
    const maxIter = 50;
    
    let finalRoot = null;
    let p0 = parseFloat(document.getElementById("p0").value);
    let a = parseFloat(document.getElementById("a").value);
    let b = parseFloat(document.getElementById("b").value);

    try {
        if (method === "bisection") {
            setupTable("Bisection Method", "");
            let f_a = safeEvalStrict(exprF, a);
            if (f_a * safeEvalStrict(exprF, b) >= 0) throw new Error("f(a) and f(b) must have opposite signs.");
            
            let pOld = a;
            for (let i = 1; i <= maxIter; i++) {
                let p = (a + b) / 2;
                let f_p = safeEvalStrict(exprF, p);
                let err = Math.abs(p - pOld);
                addRow(i, p, f_p, err);
                if (err < tol || f_p === 0) {
                    finalRoot = p;
                    document.getElementById("message").innerText = `Converged! Root ≈ ${p.toFixed(4)}`;
                    renderGraph(exprF, finalRoot, null, a, b);
                    return;
                }
                if (f_a * f_p < 0) { b = p; } else { a = p; f_a = f_p; }
                pOld = p;
            }
            throw new Error("Failed to converge.");
        }

        const exprG = parseToJS(document.getElementById("func_g").value);

        if (method === "newton") {
            setupTable("Newton's Method", "");
            let p = p0;
            const h = 1e-6;
            for (let i = 1; i <= maxIter; i++) {
                let f_val = safeEvalStrict(exprF, p);
                let f_prime = (safeEvalStrict(exprF, p + h) - safeEvalStrict(exprF, p - h)) / (2 * h);
                if (Math.abs(f_prime) < 1e-12) throw new Error("Derivative is zero.");
                let pNew = p - (f_val / f_prime);
                let err = Math.abs(pNew - p);
                let f_new = safeEvalStrict(exprF, pNew);
                addRow(i, pNew, f_new, err);
                if (err < tol) {
                    finalRoot = pNew;
                    document.getElementById("message").innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`;
                    renderGraph(exprF, finalRoot, p0, null, null);
                    return;
                }
                p = pNew;
            }
        } else if (method === "secant") {
            setupTable("Secant Method", "");
            let p1 = parseFloat(document.getElementById("p1").value);
            for (let i = 1; i <= maxIter; i++) {
                let f_p0 = safeEvalStrict(exprF, p0);
                let f_p1 = safeEvalStrict(exprF, p1);
                if (f_p1 - f_p0 === 0) throw new Error("Division by zero in secant formula.");
                let pNew = p1 - f_p1 * ((p1 - p0) / (f_p1 - f_p0));
                let err = Math.abs(pNew - p1);
                let f_new = safeEvalStrict(exprF, pNew);
                addRow(i, pNew, f_new, err);
                if (err < tol) {
                    finalRoot = pNew;
                    document.getElementById("message").innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`;
                    renderGraph(exprF, finalRoot, p0, null, null);
                    return;
                }
                p0 = p1; p1 = pNew;
            }
        } else if (method === "fixed" || method === "aitken" || method === "steffensen") {
            setupTable(method === "fixed" ? "Fixed-Point" : method === "aitken" ? "Aitken's Delta^2" : "Steffensen's", "");
            let p = p0;
            let pHatOld = p0;
            for (let i = 1; i <= maxIter; i++) {
                if (method === "fixed") {
                    let pNew = safeEvalStrict(exprG, p);
                    let err = Math.abs(pNew - p);
                    let f_new = safeEvalStrict(exprF, pNew);
                    addRow(i, pNew, f_new, err);
                    if (err < tol) {
                        finalRoot = pNew;
                        document.getElementById("message").innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`;
                        renderGraph(exprF, finalRoot, p0, null, null);
                        return;
                    }
                    p = pNew;
                } else {
                    let p1 = safeEvalStrict(exprG, p);
                    let p2 = safeEvalStrict(exprG, p1);
                    let denom = p2 - 2*p1 + p;
                    if (Math.abs(denom) < 1e-15) throw new Error("Denominator near zero.");
                    let pNew = p - Math.pow(p1 - p, 2) / denom;
                    
                    if (method === "steffensen") {
                        let err = Math.abs(pNew - p);
                        let f_new = safeEvalStrict(exprF, pNew);
                        addRow(i, pNew, f_new, err);
                        if (err < tol) {
                            finalRoot = pNew;
                            document.getElementById("message").innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`;
                            renderGraph(exprF, finalRoot, p0, null, null);
                            return;
                        }
                        p = pNew;
                    } else { 
                        let err = i > 1 ? Math.abs(pNew - pHatOld) : Math.abs(pNew - p);
                        let f_new = safeEvalStrict(exprF, pNew);
                        addRow(i, pNew, f_new, err);
                        if (err < tol) {
                            finalRoot = pNew;
                            document.getElementById("message").innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`;
                            renderGraph(exprF, finalRoot, p0, null, null);
                            return;
                        }
                        p = p1;
                        pHatOld = pNew;
                    }
                }
            }
        }
        throw new Error("Failed to converge (Max iterations reached).");
    } catch (err) {
        setupTable("Calculation Error", err.message, true);
    }
}

// --- 8. CSV EXPORTER ---
function downloadCSV() {
    let table = document.getElementById("result_table");
    let rows = table.querySelectorAll("tr");
    let csvContent = "";
    rows.forEach(function(row) {
        let cols = row.querySelectorAll("td, th");
        let rowData = [];
        cols.forEach(function(col) { rowData.push(col.innerText); });
        csvContent += rowData.join(",") + "\n";
    });
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nemerica_results.csv";
    link.click();
}

// --- INITIALIZATION ---
window.onload = function() {
    loadTheme();
    loadState();
    if (!document.getElementById("func_f").value) {
        updateInputs();
    }
};
