class QuadricSurfaceQuiz {
    constructor() {
        this.score = 0;
        this.totalQuestions = 0;
        this.streak = this.loadStreak();
        this.currentAnswer = null;
        this.hasAnswered = false;
        this.currentQuestionData = null;

        this.surfaceTypes = {
            sphere: { name: 'Sphere', description: 'All coefficients are positive and equal, D is negative' },
            ellipsoid: { name: 'Ellipsoid', description: 'All coefficients are positive but different, D is negative' },
            'one-sheet': { name: 'One-Sheet Hyperboloid', description: 'Two coefficients positive, one negative, D is negative' },
            'two-sheet': { name: 'Two-Sheet Hyperboloid', description: 'All coefficients positive, D is positive OR two negative, one positive' },
            cone: { name: 'Elliptic Cone', description: 'Two coefficients positive, one negative, D is zero' },
            cylinder: { name: 'Elliptic Cylinder', description: 'One coefficient is zero, others are positive, D is negative' }
        };

        this.initializeEventListeners();
        this.updateStats();
        this.updateNextButtonState();
        this.generateNewQuestion();

        // Initially hide visualization
        document.getElementById('quiz-visualization').classList.add('hidden');
    }

    initializeEventListeners() {
        document.querySelectorAll('.quiz-option').forEach(button => {
            button.addEventListener('click', (e) => {
                this.checkAnswer(e.target.dataset.answer);
            });
        });

        document.getElementById('next-question-btn').addEventListener('click', () => {
            if (this.hasAnswered) {
                this.generateNewQuestion();
            }
        });

        document.getElementById('visualizer-btn').addEventListener('click', () => {
            this.showVisualizerPage();
        });

        document.getElementById('quiz-btn').addEventListener('click', () => {
            this.showQuizPage();
        });

        document.getElementById('cheat-sheet-btn-quiz').addEventListener('click', () => {
            try { window.sa_event && window.sa_event('open_cheatsheet', { source: 'quiz' }); } catch (e) {}
            document.getElementById('cheat-sheet-modal').classList.remove('hidden');
        });
    }

    showVisualizerPage() {
        document.getElementById('visualizer-page').classList.remove('hidden');
        document.getElementById('quiz-page').classList.add('hidden');
        document.getElementById('visualizer-btn').classList.add('active');
        document.getElementById('quiz-btn').classList.remove('active');
        document.querySelector('.equation-card').style.display = 'block';
    }

    showQuizPage() {
        document.getElementById('visualizer-page').classList.add('hidden');
        document.getElementById('quiz-page').classList.remove('hidden');
        document.getElementById('visualizer-btn').classList.remove('active');
        document.getElementById('quiz-btn').classList.add('active');
        document.querySelector('.equation-card').style.display = 'none';
    }

    generateRandomCoefficients() {
        const types = ['sphere', 'ellipsoid', 'one-sheet', 'two-sheet', 'cone', 'cylinder'];
        const targetType = types[Math.floor(Math.random() * types.length)];

        let A, B, C, D;

        switch(targetType) {
            case 'sphere':
                const sphereRadius = Math.floor(Math.random() * 3) + 1;
                A = B = C = sphereRadius;
                D = -(Math.floor(Math.random() * 5) + 1);
                break;

            case 'ellipsoid':
                A = Math.floor(Math.random() * 4) + 1;
                B = Math.floor(Math.random() * 4) + 1;
                C = Math.floor(Math.random() * 4) + 1;
                while (A === B && B === C) {
                    B = Math.floor(Math.random() * 4) + 1;
                }
                D = -(Math.floor(Math.random() * 5) + 1);
                break;

            case 'one-sheet':
                A = Math.floor(Math.random() * 3) + 1;
                B = Math.floor(Math.random() * 3) + 1;
                C = -(Math.floor(Math.random() * 3) + 1);
                D = -(Math.floor(Math.random() * 3) + 1);
                break;

            case 'two-sheet':
                if (Math.random() < 0.5) {
                    A = Math.floor(Math.random() * 3) + 1;
                    B = Math.floor(Math.random() * 3) + 1;
                    C = Math.floor(Math.random() * 3) + 1;
                    D = Math.floor(Math.random() * 3) + 1;
                } else {
                    A = -(Math.floor(Math.random() * 3) + 1);
                    B = -(Math.floor(Math.random() * 3) + 1);
                    C = Math.floor(Math.random() * 3) + 1;
                    D = -(Math.floor(Math.random() * 3) + 1);
                }
                break;

            case 'cone':
                A = Math.floor(Math.random() * 3) + 1;
                B = Math.floor(Math.random() * 3) + 1;
                C = -(Math.floor(Math.random() * 3) + 1);
                D = 0;
                break;

            case 'cylinder':
                A = Math.floor(Math.random() * 3) + 1;
                B = Math.floor(Math.random() * 3) + 1;
                C = 0;
                D = -(Math.floor(Math.random() * 3) + 1);
                break;
        }

        return { A, B, C, D, expectedAnswer: targetType };
    }

    classifySurface(A, B, C, D) {
        if (Math.abs(D) < 0.1) {
            return 'cone';
        }

        if (C === 0) {
            return 'cylinder';
        }

        if (A > 0 && B > 0 && C > 0) {
            if (D < 0) {
                if (Math.abs(A - B) < 0.1 && Math.abs(B - C) < 0.1) {
                    return 'sphere';
                } else {
                    return 'ellipsoid';
                }
            } else if (D > 0) {
                return 'two-sheet';
            }
        }

        const positiveCount = (A > 0 ? 1 : 0) + (B > 0 ? 1 : 0) + (C > 0 ? 1 : 0);
        const negativeCount = (A < 0 ? 1 : 0) + (B < 0 ? 1 : 0) + (C < 0 ? 1 : 0);

        if (positiveCount === 2 && negativeCount === 1 && D < 0) {
            return 'one-sheet';
        }

        if (positiveCount === 1 && negativeCount === 2 && D < 0) {
            return 'two-sheet';
        }

        return 'unknown';
    }

    formatEquation(A, B, C, D) {
        const formatCoeff = (coeff) => {
            if (coeff === 1) return '';
            if (coeff === -1) return '-';
            return coeff.toString();
        };

        const formatTerm = (coeff, variable) => {
            if (coeff === 0) return '';
            const coeffStr = formatCoeff(coeff);
            return `${coeffStr}${variable}²`;
        };

        let equation = '';
        const termA = formatTerm(A, 'x');
        const termB = formatTerm(B, 'y');
        const termC = formatTerm(C, 'z');

        if (termA) equation += termA;
        if (termB) {
            if (equation && B > 0) equation += ' + ';
            if (equation && B < 0) equation += ' ';
            if (!equation) equation += termB;
            else equation += termB;
        }
        if (termC) {
            if (equation && C > 0) equation += ' + ';
            if (equation && C < 0) equation += ' ';
            if (!equation) equation += termC;
            else equation += termC;
        }

        if (D > 0) equation += ` + ${D}`;
        else if (D < 0) equation += ` ${D}`;

        equation += ' = 0';
        return equation;
    }

    generateNewQuestion() {
        // Generate new question data first
        const questionData = this.generateRandomCoefficients();
        this.currentAnswer = questionData.expectedAnswer;
        this.currentQuestionData = questionData;

        const equation = this.formatEquation(questionData.A, questionData.B, questionData.C, questionData.D);

        // If this is the first question (no animation needed)
        if (!this.totalQuestions) {
            document.getElementById('quiz-equation-text').textContent = equation;
            document.querySelector('.quiz-feedback').classList.add('hidden');

            // Clear previous result/explanation text and classes
            const resultEl = document.getElementById('quiz-result');
            if (resultEl) {
                resultEl.textContent = '';
                resultEl.className = '';
            }
            const explanationEl = document.getElementById('quiz-explanation');
            if (explanationEl) {
                explanationEl.textContent = '';
            }

            // Clear and hide visualization
            const vizElement = document.getElementById('quiz-visualization');
            vizElement.classList.add('hidden');
            const plotElement = document.getElementById('quiz-plot');
            if (plotElement) {
                try {
                    Plotly.purge(plotElement); // Properly clear Plotly plot
                } catch (e) {
                    plotElement.innerHTML = ''; // Fallback to innerHTML clear
                }
            }

            document.querySelectorAll('.quiz-option').forEach(button => {
                button.classList.remove('correct', 'incorrect', 'disabled');
                button.disabled = false;
            });

            this.hasAnswered = false;
            this.updateNextButtonState();
            return;
        }

        // Animated transition for subsequent questions
        const quizCard = document.querySelector('.quiz-card');
        const equationElement = document.getElementById('quiz-equation-text');
        const feedbackElement = document.querySelector('.quiz-feedback');
        const optionButtons = document.querySelectorAll('.quiz-option');

        // Start exit animation
        quizCard.classList.add('question-exit');

        setTimeout(() => {
            // Update content while hidden
            equationElement.textContent = equation;
            feedbackElement.classList.add('hidden');

            // Clear previous result/explanation text and classes
            const resultEl = document.getElementById('quiz-result');
            if (resultEl) {
                resultEl.textContent = '';
                resultEl.className = '';
            }
            const explanationEl = document.getElementById('quiz-explanation');
            if (explanationEl) {
                explanationEl.textContent = '';
            }

            // Clear and hide visualization
            const vizElement = document.getElementById('quiz-visualization');
            vizElement.classList.add('hidden');
            const plotElement = document.getElementById('quiz-plot');
            if (plotElement) {
                try {
                    Plotly.purge(plotElement); // Properly clear Plotly plot
                } catch (e) {
                    plotElement.innerHTML = ''; // Fallback to innerHTML clear
                }
            }

            optionButtons.forEach(button => {
                button.classList.remove('correct', 'incorrect', 'disabled');
                button.disabled = false;
            });

            // Start enter animation
            quizCard.classList.remove('question-exit');
            quizCard.classList.add('question-enter');

            // Clean up enter animation class
            setTimeout(() => {
                quizCard.classList.remove('question-enter');
            }, 250);

        }, 100); // Half of exit animation duration

        // Reset answer state for new question
        this.hasAnswered = false;
        this.updateNextButtonState();
    }

    checkAnswer(selectedAnswer) {
        this.totalQuestions++;
        const isCorrect = selectedAnswer === this.currentAnswer;

        document.querySelectorAll('.quiz-option').forEach(button => {
            button.disabled = true;
            button.classList.add('disabled');

            if (button.dataset.answer === this.currentAnswer) {
                button.classList.add('correct');
            } else if (button.dataset.answer === selectedAnswer && !isCorrect) {
                button.classList.add('incorrect');
            }
        });

        if (isCorrect) {
            this.score++;
            this.streak++;
            document.getElementById('quiz-result').textContent = 'Correct! 🎉';
            document.getElementById('quiz-result').className = 'result-correct';
        } else {
            this.streak = 0;
            document.getElementById('quiz-result').textContent = 'Incorrect 😞';
            document.getElementById('quiz-result').className = 'result-incorrect';
        }

        this.saveStreak();

        const surfaceInfo = this.surfaceTypes[this.currentAnswer];
        document.getElementById('quiz-explanation').textContent =
            `${surfaceInfo.name}: ${surfaceInfo.description}`;

        document.querySelector('.quiz-feedback').classList.remove('hidden');
        this.updateStats();

        // Mark as answered and enable next button
        this.hasAnswered = true;
        this.updateNextButtonState();

        // Show visualization
        this.showQuizVisualization();
    }

    updateStats() {
        document.getElementById('quiz-score').textContent = `${this.score}/${this.totalQuestions}`;
        document.getElementById('quiz-streak').textContent = this.streak;

        const fireElement = document.getElementById('streak-fire');
        if (this.streak >= 3) {
            let fireEmojis = '';
            if (this.streak >= 10) fireEmojis = '🔥🔥🔥';
            else if (this.streak >= 7) fireEmojis = '🔥🔥';
            else if (this.streak >= 3) fireEmojis = '🔥';
            fireElement.textContent = fireEmojis;
        } else {
            fireElement.textContent = '';
        }
    }

    saveStreak() {
        document.cookie = `quadricStreak=${this.streak}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
    }

    loadStreak() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'quadricStreak') {
                return parseInt(value) || 0;
            }
        }
        return 0;
    }

    updateNextButtonState() {
        const nextBtn = document.getElementById('next-question-btn');
        if (this.hasAnswered) {
            nextBtn.disabled = false;
            nextBtn.classList.remove('disabled');
            nextBtn.textContent = 'Next Question';
        } else {
            nextBtn.disabled = true;
            nextBtn.classList.add('disabled');
            nextBtn.textContent = 'Answer First';
        }
    }

    showQuizVisualization() {
        if (!this.currentQuestionData) {
            console.warn('No current question data for visualization');
            return;
        }

        const vizElement = document.getElementById('quiz-visualization');
        vizElement.classList.remove('hidden');

        const { A, B, C, D } = this.currentQuestionData;
        console.log('Generating surface for:', { A, B, C, D });

        const surface = this.generateQuizMeshSurface(A, B, C, D);

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

        const surfaceName = this.surfaceTypes[this.currentAnswer]?.name || 'Quadric Surface';
        const layout = {
            title: {
                text: surfaceName,
                font: { size: 16 }
            },
            scene: {
                xaxis: { title: 'X', showgrid: false, showticklabels: false },
                yaxis: { title: 'Y', showgrid: false, showticklabels: false },
                zaxis: { title: 'Z', showgrid: false, showticklabels: false },
                camera: {
                    eye: { x: 1.2, y: 1.2, z: 1.2 }
                },
                bgcolor: 'rgba(0,0,0,0)'
            },
            margin: { l: 0, r: 0, b: 0, t: 30 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        const config = {
            displayModeBar: false,
            responsive: true,
            staticPlot: false
        };

        // Small delay to ensure element is visible
        setTimeout(() => {
            try {
                Plotly.newPlot('quiz-plot', [trace], layout, config);
            } catch (error) {
                console.error('Failed to create plot:', error);
            }
        }, 100);
    }

    generateQuizMeshSurface(A, B, C, D) {
        const resolution = 20; // Lower resolution for faster rendering
        const range = 2;

        const x = [];
        const y = [];
        const z = [];

        // Initialize arrays
        for (let i = 0; i <= resolution; i++) {
            x[i] = [];
            y[i] = [];
            z[i] = [];
        }

        if (this.isQuizEllipsoidType(A, B, C, D) && A > 0 && B > 0 && C > 0 && D < 0) {
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
        } else if (this.isQuizOneSheetHyperboloid(A, B, C, D)) {
            // One-sheet hyperboloid parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 2.5;

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
        } else if (this.isQuizTwoSheetHyperboloid(A, B, C, D)) {
            // Two-sheet hyperboloid parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 3; // Parameter range

                    try {
                        // For x²/a² + y²/b² - z²/c² = 1 form (D > 0 case)
                        if (A > 0 && B > 0 && C > 0 && D > 0) {
                            const a = Math.sqrt(D / A);
                            const b = Math.sqrt(D / B);
                            const c = Math.sqrt(D / C);

                            // Generate both sheets
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
        } else if (this.isQuizCone(A, B, C, D) && Math.abs(D) < 0.1) {
            // Cone parametric surface
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const phi = (i / resolution) * 2 * Math.PI;
                    const t = ((j / resolution) - 0.5) * 3;

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
                    const t = ((j / resolution) - 0.5) * 4; // Height parameter

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

    isQuizEllipsoidType(A, B, C, D) {
        return A > 0 && B > 0 && C > 0 && D < 0;
    }

    isQuizOneSheetHyperboloid(A, B, C, D) {
        return (A > 0 && B > 0 && C < 0 && D < 0) ||
               (A > 0 && C > 0 && B < 0 && D < 0) ||
               (B > 0 && C > 0 && A < 0 && D < 0);
    }

    isQuizTwoSheetHyperboloid(A, B, C, D) {
        return (A > 0 && B > 0 && C > 0 && D > 0) ||
               (A < 0 && B < 0 && C > 0 && D < 0) ||
               (A < 0 && C < 0 && B > 0 && D < 0) ||
               (B < 0 && C < 0 && A > 0 && D < 0);
    }

    isQuizCone(A, B, C, D) {
        return Math.abs(D) < 0.1;
    }
}

let quizInstance;

document.addEventListener('DOMContentLoaded', () => {
    if (!quizInstance) {
        quizInstance = new QuadricSurfaceQuiz();
    }
});