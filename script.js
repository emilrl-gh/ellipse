class QuadricSurfaceVisualizer {
    constructor() {
        this.params = { A: 1, B: 1, C: 1, D: -1 };
        this.previousParams = { A: 1, B: 1, C: 1 };
        this.resolution = 25;
        this.plotExists = false;
        this.plotUpdateTimeout = null;
        this.range = 3;

        this.initializeEventListeners();
        this.updatePlot();
    }

    initializeEventListeners() {
        const sliders = ['paramA', 'paramB', 'paramC', 'paramD'];

        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            const valueDisplay = document.getElementById(`value${sliderId.slice(-1)}`);

            slider.addEventListener('input', (e) => {
                const param = sliderId.slice(-1);
                this.params[param] = parseFloat(e.target.value);
                valueDisplay.textContent = this.formatDisplayValue(this.params[param]);
                this.updateEquationDisplay();
                this.updatePlot();
                this.updateSurfaceInfo();
            });
        });

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadPreset(e.target.dataset.preset);
            });
        });

        document.querySelectorAll('.editable-value').forEach(span => {
            span.addEventListener('dblclick', (e) => {
                this.editValue(e.target);
            });
        });

        document.getElementById('cheat-sheet-btn-header').addEventListener('click', () => {
            try { window.sa_event && window.sa_event('open_cheatsheet', { source: 'header' }); } catch (e) {}
            document.getElementById('cheat-sheet-modal').classList.remove('hidden');
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('cheat-sheet-modal').classList.add('hidden');
        });

        document.getElementById('cheat-sheet-modal').addEventListener('click', (e) => {
            if (e.target.id === 'cheat-sheet-modal') {
                document.getElementById('cheat-sheet-modal').classList.add('hidden');
            }
        });

        // Include toggles for A, B, C
        const includeMap = [
            { checkboxId: 'includeA', paramKey: 'A', sliderId: 'paramA', valueId: 'valueA' },
            { checkboxId: 'includeB', paramKey: 'B', sliderId: 'paramB', valueId: 'valueB' },
            { checkboxId: 'includeC', paramKey: 'C', sliderId: 'paramC', valueId: 'valueC' }
        ];

        includeMap.forEach(({ checkboxId, paramKey, sliderId, valueId }) => {
            const checkbox = document.getElementById(checkboxId);
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(valueId);

            if (!checkbox || !slider || !valueSpan) return;

            checkbox.addEventListener('change', () => {
                if (!checkbox.checked) {
                    // Store previous value and zero out
                    this.previousParams[paramKey] = this.params[paramKey];
                    this.params[paramKey] = 0;
                    slider.disabled = true;
                    slider.value = 0;
                    valueSpan.textContent = this.formatDisplayValue(0);
                } else {
                    // Restore previous value (fallback to 1 if missing)
                    const restored = (typeof this.previousParams[paramKey] === 'number') ? this.previousParams[paramKey] : 1;
                    this.params[paramKey] = restored;
                    slider.disabled = false;
                    slider.value = restored;
                    valueSpan.textContent = this.formatDisplayValue(restored);
                }

                this.updateEquationDisplay();
                this.updatePlot();
                this.updateSurfaceInfo();
            });
        });
    }

    updateEquationDisplay() {
        const { A, B, C, D } = this.params;

        // If include toggles exist and are unchecked, force showing 0x²/0y²/0z²
        const includeA = document.getElementById('includeA');
        const includeB = document.getElementById('includeB');
        const includeC = document.getElementById('includeC');
        const forceZeroA = includeA ? !includeA.checked : false;
        const forceZeroB = includeB ? !includeB.checked : false;
        const forceZeroC = includeC ? !includeC.checked : false;

        const formatCoeff = (coeff) => {
            if (coeff === 1) return '';
            if (coeff === -1) return '-';
            return coeff.toString();
        };

        const formatTerm = (coeff, variable, forceZero) => {
            if (forceZero) return `0${variable}²`;
            if (coeff === 0) return '';
            const coeffStr = formatCoeff(coeff);
            return `${coeffStr}${variable}²`;
        };

        let equation = '';
        const termA = formatTerm(A, 'x', forceZeroA);
        const termB = formatTerm(B, 'y', forceZeroB);
        const termC = formatTerm(C, 'z', forceZeroC);

        if (termA) equation += termA;
        if (termB) {
            if (equation && (!forceZeroB && B > 0)) equation += ' + ';
            else if (equation && forceZeroB) equation += ' + ';
            equation += termB;
        }
        if (termC) {
            if (equation && (!forceZeroC && C > 0)) equation += ' + ';
            else if (equation && forceZeroC) equation += ' + ';
            equation += termC;
        }

        if (D > 0) equation += ` + ${D}`;
        else if (D < 0) equation += ` ${D}`;

        equation += ' = 0';

        if (document.getElementById('equation-text-main')) {
            document.getElementById('equation-text-main').textContent = equation;
        }
    }

    generateSurfacePoints() {
        const { A, B, C, D } = this.params;
        const points = { x: [], y: [], z: [] };

        if (A === 0 && B === 0 && C === 0) return points;

        const step = (2 * this.range) / this.resolution;

        for (let i = 0; i <= this.resolution; i++) {
            for (let j = 0; j <= this.resolution; j++) {
                const u = -this.range + i * step;
                const v = -this.range + j * step;

                let x, y, z;

                if (this.isEllipsoidType()) {
                    if (A <= 0 || B <= 0 || C <= 0 || D >= 0) continue;

                    const phi = u * Math.PI;
                    const theta = v * Math.PI / 2;

                    const a = Math.sqrt(-D / A);
                    const b = Math.sqrt(-D / B);
                    const c = Math.sqrt(-D / C);

                    x = a * Math.sin(phi) * Math.cos(theta);
                    y = b * Math.sin(phi) * Math.sin(theta);
                    z = c * Math.cos(phi);

                } else if (this.isOneSheetHyperboloid()) {
                    const a = Math.sqrt(Math.abs(D / A));
                    const b = Math.sqrt(Math.abs(D / B));
                    const c = Math.sqrt(Math.abs(-D / C));

                    const phi = u * Math.PI * 2;
                    const t = v * 2;

                    x = a * Math.cosh(t) * Math.cos(phi);
                    y = b * Math.cosh(t) * Math.sin(phi);
                    z = c * Math.sinh(t);

                } else if (this.isCone()) {
                    const t = u;
                    const phi = v * Math.PI * 2;

                    const a = Math.sqrt(Math.abs(1 / A));
                    const b = Math.sqrt(Math.abs(1 / B));
                    const c = Math.sqrt(Math.abs(1 / C));

                    x = a * t * Math.cos(phi);
                    y = b * t * Math.sin(phi);
                    z = c * t;

                } else {
                    if (C !== 0) {
                        x = u;
                        y = v;
                        const zSquared = -(A * x * x + B * y * y + D) / C;
                        if (zSquared >= 0) {
                            z = Math.sqrt(zSquared);
                            points.x.push(x, x);
                            points.y.push(y, y);
                            points.z.push(z, -z);
                        }
                        continue;
                    }
                }

                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    points.x.push(x);
                    points.y.push(y);
                    points.z.push(z);
                }
            }
        }

        return points;
    }

    generateMeshSurface() {
        const { A, B, C, D } = this.params;
        const resolution = 25;
        const range = 2.5;

        const x = [];
        const y = [];
        const z = [];

        // Initialize arrays
        for (let i = 0; i <= resolution; i++) {
            x[i] = [];
            y[i] = [];
            z[i] = [];
        }

        if (this.isEllipsoidType() && A > 0 && B > 0 && C > 0 && D < 0) {
            // Ellipsoid/Sphere parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const theta = (j / resolution) * Math.PI;

                    const a = Math.sqrt(-D / A);
                    const b = Math.sqrt(-D / B);
                    const c = Math.sqrt(-D / C);

                    x[i][j] = a * Math.sin(theta) * Math.cos(phi);
                    y[i][j] = b * Math.sin(theta) * Math.sin(phi);
                    z[i][j] = c * Math.cos(theta);
                }
            }
        } else if (this.isOneSheetHyperboloid()) {
            // One-sheet hyperboloid parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 3;

                    try {
                        const a = Math.sqrt(Math.abs(D / A));
                        const b = Math.sqrt(Math.abs(D / B));
                        const c = Math.sqrt(Math.abs(-D / C));

                        x[i][j] = a * Math.cosh(t) * Math.cos(phi);
                        y[i][j] = b * Math.cosh(t) * Math.sin(phi);
                        z[i][j] = c * Math.sinh(t);
                    } catch (e) {
                        x[i][j] = 0;
                        y[i][j] = 0;
                        z[i][j] = 0;
                    }
                }
            }
        } else if (this.isTwoSheetHyperboloid()) {
            // Two-sheet hyperboloid parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 4; // Parameter range

                    try {
                        // For x²/a² + y²/b² - z²/c² = 1 form (D > 0 case)
                        if (A > 0 && B > 0 && C > 0 && D > 0) {
                            const a = Math.sqrt(D / A);
                            const b = Math.sqrt(D / B);
                            const c = Math.sqrt(D / C);

                            // Generate both sheets by using ±sqrt(1 + t²) for the hyperbolic part
                            const hyperFactor = Math.sqrt(1 + t * t);

                            if (j < resolution / 2) {
                                // Upper sheet
                                x[i][j] = a * hyperFactor * Math.cos(phi);
                                y[i][j] = b * hyperFactor * Math.sin(phi);
                                z[i][j] = c * (1 + Math.abs(t));
                            } else {
                                // Lower sheet
                                x[i][j] = a * hyperFactor * Math.cos(phi);
                                y[i][j] = b * hyperFactor * Math.sin(phi);
                                z[i][j] = -c * (1 + Math.abs(t));
                            }
                        } else {
                            // Handle other two-sheet cases
                            x[i][j] = 0;
                            y[i][j] = 0;
                            z[i][j] = 0;
                        }
                    } catch (e) {
                        x[i][j] = 0;
                        y[i][j] = 0;
                        z[i][j] = 0;
                    }
                }
            }
        } else if (this.isCone() && Math.abs(D) < 0.1) {
            // Cone parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 4;

                    try {
                        const a = Math.sqrt(Math.abs(1 / Math.abs(A)));
                        const b = Math.sqrt(Math.abs(1 / Math.abs(B)));
                        const c = Math.sqrt(Math.abs(1 / Math.abs(C)));

                        x[i][j] = a * t * Math.cos(phi);
                        y[i][j] = b * t * Math.sin(phi);
                        z[i][j] = c * t;
                    } catch (e) {
                        x[i][j] = 0;
                        y[i][j] = 0;
                        z[i][j] = 0;
                    }
                }
            }
        } else if (Math.abs(C) < 0.001 && A > 0 && B > 0 && D < 0) {
            // Elliptic cylinder parametric surface (C = 0)
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const theta = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 6; // Height parameter

                    try {
                        const a = Math.sqrt(-D / A);
                        const b = Math.sqrt(-D / B);

                        x[i][j] = a * Math.cos(theta);
                        y[i][j] = b * Math.sin(theta);
                        z[i][j] = t;
                    } catch (e) {
                        x[i][j] = 0;
                        y[i][j] = 0;
                        z[i][j] = 0;
                    }
                }
            }
        } else {
            // General implicit surface (solve for z)
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const u = -range + (i / resolution) * 2 * range;
                    const v = -range + (j / resolution) * 2 * range;

                    x[i][j] = u;
                    y[i][j] = v;

                    if (Math.abs(C) > 0.001) {
                        const zSquared = -(A * u * u + B * v * v + D) / C;
                        if (zSquared >= 0) {
                            z[i][j] = Math.sqrt(zSquared);
                        } else {
                            z[i][j] = NaN;
                        }
                    } else {
                        z[i][j] = NaN;
                    }
                }
            }
        }

        return { x, y, z };
    }

    isEllipsoidType() {
        const { A, B, C, D } = this.params;
        return A > 0 && B > 0 && C > 0 && D < 0;
    }

    isOneSheetHyperboloid() {
        const { A, B, C, D } = this.params;
        return (A > 0 && B > 0 && C < 0 && D < 0) ||
               (A > 0 && C > 0 && B < 0 && D < 0) ||
               (B > 0 && C > 0 && A < 0 && D < 0);
    }

    isTwoSheetHyperboloid() {
        const { A, B, C, D } = this.params;
        return (A > 0 && B > 0 && C > 0 && D > 0) ||
               (A < 0 && B < 0 && C > 0 && D < 0) ||
               (A < 0 && C < 0 && B > 0 && D < 0) ||
               (B < 0 && C < 0 && A > 0 && D < 0);
    }

    isCone() {
        const { D } = this.params;
        return Math.abs(D) < 0.1;
    }

    getSurfaceType() {
        if (this.isCone()) return 'Elliptic Cone';
        if (this.isEllipsoidType()) {
            const { A, B, C } = this.params;
            if (Math.abs(A - B) < 0.1 && Math.abs(B - C) < 0.1) return 'Sphere';
            return 'Ellipsoid';
        }
        if (this.isOneSheetHyperboloid()) return 'One-Sheet Hyperboloid';
        if (this.isTwoSheetHyperboloid()) return 'Two-Sheet Hyperboloid';
        return 'Quadric Surface';
    }

    getSurfaceDescription() {
        const { A, B, C, D } = this.params;
        const type = this.getSurfaceType();

        const formatSign = (val) => val > 0 ? '+' : '-';
        const signPattern = `${formatSign(A)} ${formatSign(B)} ${formatSign(C)}`;
        const dSign = formatSign(D);

        const descriptions = {
            'Sphere': `All coefficients positive and equal (${signPattern}), D negative (${dSign}): creates perfect symmetry`,
            'Ellipsoid': `All coefficients positive (${signPattern}), D negative (${dSign}): closed surface with different radii`,
            'One-Sheet Hyperboloid': `Two positive, one negative (${signPattern}), D negative (${dSign}): opens like a saddle`,
            'Two-Sheet Hyperboloid': `Pattern ${signPattern}, D ${dSign}: creates two separate sheets`,
            'Elliptic Cone': `Two positive, one negative (${signPattern}), D = 0: vertex at origin`,
            'Elliptic Cylinder': `One coefficient zero, others positive, D negative: extends infinitely along missing axis`,
            'Quadric Surface': `Pattern ${signPattern}, D ${dSign}: general quadric form`
        };
        return descriptions[type] || descriptions['Quadric Surface'];
    }

    updateSurfaceInfo() {
        const type = this.getSurfaceType();
        const description = this.getSurfaceDescription();

        if (document.getElementById('surface-type-main')) {
            document.getElementById('surface-type-main').textContent = type;
        }

        if (document.getElementById('surface-description-main')) {
            document.getElementById('surface-description-main').textContent = description;
        }
    }

    updatePlot() {
        if (this.plotUpdateTimeout) {
            clearTimeout(this.plotUpdateTimeout);
        }

        this.plotUpdateTimeout = setTimeout(() => {
            const surface = this.generateMeshSurface();

            const trace = {
                type: 'surface',
                x: surface.x,
                y: surface.y,
                z: surface.z,
                colorscale: 'Viridis',
                opacity: 0.8,
                showscale: false,
                contours: {
                    x: { show: false },
                    y: { show: false },
                    z: { show: false }
                },
                lighting: {
                    ambient: 0.8,
                    diffuse: 0.8,
                    specular: 0.1
                }
            };

            const layout = {
                title: 'Quadric Surface Visualization',
                scene: {
                    xaxis: { title: 'X', showgrid: false },
                    yaxis: { title: 'Y', showgrid: false },
                    zaxis: { title: 'Z', showgrid: false },
                    camera: {
                        eye: { x: 1.5, y: 1.5, z: 1.5 }
                    },
                    bgcolor: 'rgba(0,0,0,0)'
                },
                margin: { l: 0, r: 0, b: 0, t: 50 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)'
            };

            const config = {
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
                staticPlot: false,
                responsive: true
            };

            if (this.plotExists) {
                Plotly.react('plot', [trace], layout, config);
            } else {
                Plotly.newPlot('plot', [trace], layout, config);
                this.plotExists = true;
            }
        }, 100);
    }

    loadPreset(presetType) {
        const presets = {
            sphere: { A: 1, B: 1, C: 1, D: -1 },
            ellipsoid: { A: 1, B: 2, C: 0.5, D: -1 },
            'one-sheet': { A: 1, B: 1, C: -1, D: -1 },
            'two-sheet': { A: 1, B: 1, C: -1, D: 1 },
            cone: { A: 1, B: 1, C: -1, D: 0 },
            cylinder: { A: 1, B: 1, C: 0, D: -1 }
        };

        if (presets[presetType]) {
            this.params = { ...presets[presetType] };
            this.updateSliders();
            this.updateEquationDisplay();
            this.updatePlot();
            this.updateSurfaceInfo();
        }
    }

    updateSliders() {
        document.getElementById('paramA').value = this.params.A;
        document.getElementById('paramB').value = this.params.B;
        document.getElementById('paramC').value = this.params.C;
        document.getElementById('paramD').value = this.params.D;

        document.getElementById('valueA').textContent = this.formatDisplayValue(this.params.A);
        document.getElementById('valueB').textContent = this.formatDisplayValue(this.params.B);
        document.getElementById('valueC').textContent = this.formatDisplayValue(this.params.C);
        document.getElementById('valueD').textContent = this.formatDisplayValue(this.params.D);

        // Respect include toggles when updating sliders
        const includeA = document.getElementById('includeA');
        const includeB = document.getElementById('includeB');
        const includeC = document.getElementById('includeC');
        if (includeA) document.getElementById('paramA').disabled = !includeA.checked;
        if (includeB) document.getElementById('paramB').disabled = !includeB.checked;
        if (includeC) document.getElementById('paramC').disabled = !includeC.checked;
    }

    editValue(span) {
        const currentValue = span.textContent;
        const input = document.createElement('input');
        input.type = 'text'; // Changed from 'number' to 'text' to allow fractions
        input.value = currentValue;
        input.className = 'custom-number-input';

        // Apply custom styles to override system defaults
        Object.assign(input.style, {
            width: '60px',
            height: '24px',
            fontSize: '0.9em',
            fontFamily: 'inherit',
            padding: '2px 6px',
            border: '2px solid #667eea',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            color: '#2d3748',
            outline: 'none',
            boxSizing: 'border-box',
            textAlign: 'center',
            appearance: 'textfield',
            MozAppearance: 'textfield',
            WebkitAppearance: 'none'
        });

        span.style.display = 'none';
        span.parentNode.insertBefore(input, span.nextSibling);

        input.focus();
        input.select();

        const finishEdit = () => {
            const inputValue = input.value.trim();
            let newValue;

            // Try to parse as fraction first
            if (inputValue.includes('/')) {
                newValue = this.parseFraction(inputValue);
            } else {
                newValue = parseFloat(inputValue);
            }

            // Fallback to 0 if parsing failed
            if (isNaN(newValue)) {
                newValue = 0;
            }

            const param = span.id.slice(-1); // Get A, B, C, or D

            // Update the parameter
            this.params[param] = newValue;

            // Display the value in a nice format
            span.textContent = this.formatDisplayValue(newValue);

            // Update the corresponding slider
            const slider = document.getElementById(`param${param}`);
            if (newValue >= -5 && newValue <= 5) {
                slider.value = newValue;
            }

            // Update displays and plot
            this.updateEquationDisplay();
            this.updatePlot();
            this.updateSurfaceInfo();

            // Clean up
            span.style.display = 'inline';
            input.remove();
        };

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                span.style.display = 'inline';
                input.remove();
            }
        });
    }

    parseFraction(fractionString) {
        // Handle negative fractions
        const isNegative = fractionString.startsWith('-');
        const cleanFraction = fractionString.replace(/^-/, '');

        // Split by '/'
        const parts = cleanFraction.split('/');
        if (parts.length !== 2) {
            return NaN;
        }

        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);

        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
            return NaN;
        }

        const result = numerator / denominator;
        return isNegative ? -result : result;
    }

    formatDisplayValue(value) {
        // Round to avoid floating point precision issues and display up to 4 decimal places
        const rounded = Math.round(value * 10000) / 10000;

        // Remove trailing zeros
        return parseFloat(rounded.toFixed(4));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuadricSurfaceVisualizer();
});

// Simple analytics event helper (sa_event)
// Provides a safe global function to record events and a small inline helper
// that maps elements with `data-simple-event` to calls to `sa_event(name, meta)`.
// This will not overwrite an existing `sa_event` if one is already provided by
// a third-party analytics script.
(function () {
    // Don't overwrite if the analytics script already defines sa_event
    if (window.sa_event) return;

    window._sa_queue = window._sa_queue || [];

    function isPlainObject(val) {
        return val && typeof val === 'object' && !Array.isArray(val);
    }

    function tryFlushQueue() {
        // If a third-party analytics function exists, try to forward queued events.
        // Commonly analytics libraries expose a `sa` or `sa_event` function; try both.
        const forward = (typeof window.sa === 'function') ? window.sa : (typeof window.__sa_event_forward === 'function' ? window.__sa_event_forward : null);
        if (!forward) return false;

        while (window._sa_queue.length) {
            const ev = window._sa_queue.shift();
            try {
                forward(ev.name, ev.metadata);
            } catch (e) {
                // If forwarding fails, put it back and stop trying for now
                window._sa_queue.unshift(ev);
                return false;
            }
        }

        return true;
    }

    // Expose sa_event globally
    window.sa_event = function (name, metadata) {
        try {
            if (typeof name !== 'string' || !name.trim()) {
                console.warn('sa_event: invalid event name', name);
                return false;
            }

            if (metadata != null && !isPlainObject(metadata)) {
                // Allow JSON strings too
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        console.warn('sa_event: metadata must be an object or JSON string', metadata);
                        metadata = { value: metadata };
                    }
                } else {
                    metadata = { value: metadata };
                }
            }

            const event = { name: name.trim(), metadata: metadata || null, ts: Date.now() };

            // If a forwarding function exists now, send immediately
            if (typeof window.sa === 'function') {
                try {
                    window.sa(event.name, event.metadata);
                    return true;
                } catch (e) {
                    // fallthrough to queue
                }
            }

            // Otherwise queue the event for later flushing
            window._sa_queue.push(event);

            return true;
        } catch (e) {
            console.error('sa_event error', e);
            return false;
        }
    };

    // Periodically attempt to flush the queue in case the analytics lib loads later
    let checks = 0;
    const maxChecks = 20; // ~10s with 500ms interval
    const intervalId = setInterval(() => {
        checks += 1;
        if (tryFlushQueue() || checks >= maxChecks) {
            clearInterval(intervalId);
        }
    }, 500);

    // Inline events helper: delegate click events from elements with data-simple-event
    document.addEventListener('click', (e) => {
        const el = e.target.closest && e.target.closest('[data-simple-event]');
        if (!el) return;

        const name = el.getAttribute('data-simple-event');
        if (!name) return;

        let meta = null;
        const metaAttr = el.getAttribute('data-simple-event-meta');
        if (metaAttr) {
            try {
                meta = JSON.parse(metaAttr);
            } catch (err) {
                // fallback: store raw string
                meta = { value: metaAttr };
            }
        }

        try {
            window.sa_event(name, meta);
        } catch (err) {
            console.warn('sa_event call failed', err);
        }
    });
})();

// removed sa_event modal handlers