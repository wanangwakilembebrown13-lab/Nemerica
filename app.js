// --- 1. PARSER & SAFE EVALUATION ---
// Converts LaTeX input to JavaScript executable syntax
function parseToJS(expr) {
    if (!expr) return "";
    expr = expr.replace(/\^/g, "**");
    expr = expr.replace(/\\sin/g, "Math.sin")
               .replace(/\\cos/g, "Math.cos")
               .replace(/\\tan/g, "Math.tan")
               .replace(/\\exp/g, "Math.exp")
               .replace(/\\ln/g, "Math.log")
               .replace(/\\log/g, "Math.log10")
               .replace(/\\sqrt/g, "Math.sqrt")
               .replace(/\\pi/g, "Math.PI");
    // Implicit multiplication (3x -> 3*x, 2(x) -> 2*(x))
    expr = expr.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
    return expr;
}

function safeEval(expr, x) {
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

// --- 2. KATEX MATH RENDERING (LIVE PREVIEW) ---
function updatePreview(inputId, previewId) {
    const rawInput = document.getElementById(inputId).value;
    const previewDiv = document.getElementById(previewId);
    
    if (!rawInput.trim()) {
        previewDiv.innerHTML = "";
        return;
    }
    
    // Minor LaTeX formatting adjustments for visual accuracy
    let latexStr = rawInput
        .replace(/\*/g, " \\cdot ") // make asterisks look like dots
        .replace(/sqrt/g, "\\sqrt"); 

    // Render with KaTeX
    try {
        katex.render(latexStr, previewDiv, {
            throwOnError: false, // Don't crash on incomplete LaTeX
            displayMode: true
        });
    } catch (e) {
        previewDiv.innerHTML = rawInput; // Fallback to raw text
    }
}

// --- 3. UI LOGIC ---
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

// --- 4. MATH ALGORITHMS ---
function addRow(iter, p, err) {
    const tbody = document.querySelector("#result_table tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${iter}</td><td>${p.toFixed(6)}</td><td>${err.toFixed(6)}</td>`;
    tbody.appendChild(tr);
}

function setupTable(title, msg, isError = false) {
    document.getElementById("results").classList.remove("hidden");
    document.getElementById("result_title").innerText = title;
    const msgBox = document.getElementById("message");
    msgBox.className = isError ? "error" : "success";
    msgBox.innerText = msg;
    if (!isError) msgBox.classList.add("hidden"); // hide if empty
    document.querySelector("#result_table tbody").innerHTML = "";
}

function calculate() {
    const method = document.getElementById("method").value;
    const exprF = parseToJS(document.getElementById("func_f").value);
    let tolInput = document.getElementById("tol").value;
    const tol = tolInput ? parseFloat(tolInput) : 0.01;
    const maxIter = 50;

    try {
        if (method === "bisection") {
            let a = parseFloat(document.getElementById("a").value);
            let b = parseFloat(document.getElementById("b").value);
            setupTable("Bisection Method", "");
            let f_a = safeEval(exprF, a);
            if (f_a * safeEval(exprF, b) >= 0) throw new Error("f(a) and f(b) must have opposite signs.");
            
            let pOld = a;
            for (let i = 1; i <= maxIter; i++) {
                let p = (a + b) / 2;
                let f_p = safeEval(exprF, p);
                let err = Math.abs(p - pOld);
                addRow(i, p, err);
                if (err < tol || f_p === 0) {
                    const msg = document.getElementById("message");
                    msg.className = "success"; msg.innerText = `Converged! Root ≈ ${p.toFixed(4)}`; return;
                }
                if (f_a * f_p < 0) { b = p; } else { a = p; f_a = f_p; }
                pOld = p;
            }
            throw new Error("Failed to converge in max iterations.");
        }

        const exprG = parseToJS(document.getElementById("func_g").value);
        let p0 = parseFloat(document.getElementById("p0").value);

        if (method === "newton") {
            setupTable("Newton's Method", "");
            let p = p0;
            const h = 1e-6;
            for (let i = 1; i <= maxIter; i++) {
                let f_val = safeEval(exprF, p);
                let f_prime = (safeEval(exprF, p + h) - safeEval(exprF, p - h)) / (2 * h);
                if (Math.abs(f_prime) < 1e-12) throw new Error("Derivative is zero.");
                let pNew = p - (f_val / f_prime);
                let err = Math.abs(pNew - p);
                addRow(i, pNew, err);
                if (err < tol) {
                    const msg = document.getElementById("message");
                    msg.className = "success"; msg.innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`; return;
                }
                p = pNew;
            }
        } else if (method === "secant") {
            setupTable("Secant Method", "");
            let p1 = parseFloat(document.getElementById("p1").value);
            for (let i = 1; i <= maxIter; i++) {
                let f_p0 = safeEval(exprF, p0);
                let f_p1 = safeEval(exprF, p1);
                if (f_p1 - f_p0 === 0) throw new Error("Division by zero in secant formula.");
                let pNew = p1 - f_p1 * ((p1 - p0) / (f_p1 - f_p0));
                let err = Math.abs(pNew - p1);
                addRow(i, pNew, err);
                if (err < tol) {
                    const msg = document.getElementById("message");
                    msg.className = "success"; msg.innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`; return;
                }
                p0 = p1; p1 = pNew;
            }
        } else if (method === "fixed" || method === "aitken" || method === "steffensen") {
            setupTable(method === "fixed" ? "Fixed-Point" : method === "aitken" ? "Aitken's Delta^2" : "Steffensen's", "");
            let p = p0;
            let pHatOld = p0;
            for (let i = 1; i <= maxIter; i++) {
                if (method === "fixed") {
                    let pNew = safeEval(exprG, p);
                    let err = Math.abs(pNew - p);
                    addRow(i, pNew, err);
                    if (err < tol) {
                        const msg = document.getElementById("message");
                        msg.className = "success"; msg.innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`; return;
                    }
                    p = pNew;
                } else {
                    let p1 = safeEval(exprG, p);
                    let p2 = safeEval(exprG, p1);
                    let denom = p2 - 2*p1 + p;
                    if (Math.abs(denom) < 1e-15) throw new Error("Denominator near zero.");
                    let pNew = p - Math.pow(p1 - p, 2) / denom;
                    
                    if (method === "steffensen") {
                        let err = Math.abs(pNew - p);
                        addRow(i, pNew, err);
                        if (err < tol) {
                            const msg = document.getElementById("message");
                            msg.className = "success"; msg.innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`; return;
                        }
                        p = pNew;
                    } else { // Aitken
                        let err = i > 1 ? Math.abs(pNew - pHatOld) : Math.abs(pNew - p);
                        addRow(i, pNew, err);
                        if (err < tol) {
                            const msg = document.getElementById("message");
                            msg.className = "success"; msg.innerText = `Converged! Root ≈ ${pNew.toFixed(4)}`; return;
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

// Initialize UI on load
updateInputs();