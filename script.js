/**
 * Advanced Calculator Logic for GitHub Pages
 */

class Calculator {
    constructor() {
        this.currentInput = '0';
        this.history = JSON.parse(localStorage.getItem('calc_history') || '[]');
        this.memory = parseFloat(localStorage.getItem('calc_memory') || '0');
        this.isScientific = false;
        this.lastExpression = '';
        this.shouldResetScreen = false;
        this.currentMode = 'calc';
        
        // DOM Elements
        this.displayInput = document.getElementById('current-input');
        this.displayHistory = document.getElementById('history-preview');
        this.memoryIndicator = document.getElementById('memory-indicator');
        this.historyList = document.getElementById('history-list');
        this.calculatorEl = document.getElementById('calculator');
        
        // Audio
        this.clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        this.clickSound.volume = 0.2;

        // Voice
        this.recognition = null;

        this.init();
    }

    init() {
        this.updateDisplay();
        this.updateMemoryIndicator();
        this.renderHistory();
        this.setupEventListeners();
        this.initVoice();
        this.initTheme();
        this.initConverters();
    }

    initVoice() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processVoiceCommand(transcript);
                document.getElementById('voice-btn').classList.remove('voice-active');
            };

            this.recognition.onerror = () => {
                document.getElementById('voice-btn').classList.remove('voice-active');
            };
        }
    }

    processVoiceCommand(text) {
        let processed = text
            .replace(/plus/g, '+')
            .replace(/minus/g, '-')
            .replace(/times|multiplied by/g, '*')
            .replace(/divided by/g, '/')
            .replace(/equals|is/g, '=')
            .replace(/clear/g, 'AC')
            .replace(/point/g, '.')
            .replace(/[^0-9\+\-\*\/\.\(\)\=AC]/g, '');

        if (processed.includes('AC')) {
            this.clear();
        } else if (processed.includes('=')) {
            const parts = processed.split('=');
            if (parts[0]) {
                this.currentInput = parts[0];
                this.calculate();
            }
        } else {
            this.currentInput = processed || this.currentInput;
            this.updateDisplay();
        }
    }

    initTheme() {
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                document.documentElement.style.setProperty('--accent-color', color);
                document.documentElement.style.setProperty('--accent-hover', this.adjustColor(color, -20));
                
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                localStorage.setItem('calc_accent', color);
            });
        });

        document.getElementById('blur-range').addEventListener('input', (e) => {
            const val = e.target.value;
            document.documentElement.style.setProperty('--glass-blur', `${val}px`);
            const style = document.createElement('style');
            style.innerHTML = `.calculator, .side-panel, .mode-overlay { backdrop-filter: blur(${val}px) !important; -webkit-backdrop-filter: blur(${val}px) !important; }`;
            document.head.appendChild(style);
        });

        document.getElementById('opacity-range').addEventListener('input', (e) => {
            const val = parseInt(e.target.value) / 100;
            const isDark = document.body.getAttribute('data-theme') !== 'light';
            const base = isDark ? '0, 0, 0' : '255, 255, 255';
            document.documentElement.style.setProperty('--glass-bg', `rgba(${base}, ${val})`);
        });

        const savedAccent = localStorage.getItem('calc_accent');
        if (savedAccent) {
            document.documentElement.style.setProperty('--accent-color', savedAccent);
        }
    }

    adjustColor(col, amt) {
        let usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        let num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    }

    initConverters() {
        const updateCurrency = async () => {
            const amount = parseFloat(document.getElementById('curr-amount').value);
            const from = document.getElementById('curr-from').value;
            const to = document.getElementById('curr-to').value;
            
            try {
                const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
                const data = await res.json();
                const rate = data.rates[to];
                document.getElementById('curr-result').innerText = (amount * rate).toFixed(2);
            } catch (e) {
                // Fallback static rates if API fails
                const fallbackRates = { USD: 1, EUR: 0.95, GBP: 0.79, INR: 83.5, JPY: 150 };
                const rate = (fallbackRates[to] || 1) / (fallbackRates[from] || 1);
                document.getElementById('curr-result').innerText = (amount * rate).toFixed(2) + ' (Offline)';
            }
        };

        document.getElementById('curr-amount').addEventListener('input', updateCurrency);
        document.getElementById('curr-from').addEventListener('change', updateCurrency);
        document.getElementById('curr-to').addEventListener('change', updateCurrency);

        const units = {
            length: { m: 1, km: 1000, mile: 1609.34, ft: 0.3048 },
            weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 },
            temp: { c: 'c', f: 'f', k: 'k' }
        };

        const updateUnitOptions = () => {
            const type = document.getElementById('unit-type').value;
            const fromSelect = document.getElementById('unit-from');
            const toSelect = document.getElementById('unit-to');
            
            const options = Object.keys(units[type]).map(u => `<option value="${u}">${u.toUpperCase()}</option>`).join('');
            fromSelect.innerHTML = options;
            toSelect.innerHTML = options;
            updateUnits();
        };

        const updateUnits = () => {
            const type = document.getElementById('unit-type').value;
            const amount = parseFloat(document.getElementById('unit-amount').value);
            const from = document.getElementById('unit-from').value;
            const to = document.getElementById('unit-to').value;
            const resultEl = document.getElementById('unit-result');

            if (type === 'temp') {
                let celsius = amount;
                if (from === 'f') celsius = (amount - 32) * 5/9;
                if (from === 'k') celsius = amount - 273.15;

                let res = celsius;
                if (to === 'f') res = (celsius * 9/5) + 32;
                if (to === 'k') res = celsius + 273.15;
                resultEl.innerText = res.toFixed(2);
            } else {
                const fromRate = units[type][from];
                const toRate = units[type][to];
                resultEl.innerText = ((amount * fromRate) / toRate).toFixed(4);
            }
        };

        document.getElementById('unit-type').addEventListener('change', updateUnitOptions);
        document.getElementById('unit-amount').addEventListener('input', updateUnits);
        document.getElementById('unit-from').addEventListener('change', updateUnits);
        document.getElementById('unit-to').addEventListener('change', updateUnits);
        updateUnitOptions();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.calc-btn');
            if (!btn) return;
            this.playSound();
            const action = btn.dataset.action;
            const value = btn.dataset.value;
            if (action) this.handleAction(action);
            else if (value) this.handleInput(value);
        });

        document.getElementById('mode-toggle').addEventListener('click', () => {
            document.getElementById('mode-overlay').classList.remove('hidden');
        });

        document.querySelectorAll('.mode-opt').forEach(opt => {
            opt.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.switchMode(mode);
                document.getElementById('mode-overlay').classList.add('hidden');
                document.querySelectorAll('.mode-opt').forEach(o => o.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        document.getElementById('voice-btn').addEventListener('click', () => {
            if (this.recognition) {
                this.recognition.start();
                document.getElementById('voice-btn').classList.add('voice-active');
            } else {
                alert('Voice recognition not supported in this browser.');
            }
        });

        document.getElementById('theme-panel-toggle').addEventListener('click', () => {
            document.getElementById('history-panel').classList.remove('open');
            document.getElementById('theme-panel').classList.add('open');
        });
        document.getElementById('close-theme-panel').addEventListener('click', () => {
            document.getElementById('theme-panel').classList.remove('open');
        });

        document.getElementById('copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(this.currentInput);
            const icon = document.querySelector('#copy-btn i');
            icon.setAttribute('data-lucide', 'check');
            lucide.createIcons();
            setTimeout(() => {
                icon.setAttribute('data-lucide', 'copy');
                lucide.createIcons();
            }, 2000);
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Calculator Result',
                    text: `Check out this calculation: ${this.lastExpression} ${this.currentInput}`,
                    url: window.location.href
                });
            } else {
                alert('Sharing not supported on this device.');
            }
        });

        document.getElementById('close-graph').addEventListener('click', () => {
            document.getElementById('graph-container').classList.add('hidden');
        });

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            const icon = document.querySelector('#theme-toggle i');
            icon.setAttribute('data-lucide', newTheme === 'light' ? 'moon' : 'sun');
            lucide.createIcons();
        });

        document.getElementById('sci-toggle').addEventListener('click', () => {
            this.isScientific = !this.isScientific;
            this.calculatorEl.classList.toggle('scientific', this.isScientific);
        });

        document.getElementById('history-toggle').addEventListener('click', () => {
            document.getElementById('theme-panel').classList.remove('open');
            document.getElementById('history-panel').classList.add('open');
        });

        document.getElementById('close-history').addEventListener('click', () => {
            document.getElementById('history-panel').classList.remove('open');
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            this.history = [];
            localStorage.setItem('calc_history', '[]');
            this.renderHistory();
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        const containers = ['buttons-grid', 'scientific-grid', 'currency-container', 'unit-container', 'graph-container'];
        containers.forEach(c => document.querySelector(`.${c}`).classList.add('hidden'));
        
        if (mode === 'calc') {
            document.querySelector('.buttons-grid').classList.remove('hidden');
            if (this.isScientific) document.querySelector('.scientific-grid').classList.remove('hidden');
        } else if (mode === 'currency') {
            document.getElementById('currency-container').classList.remove('hidden');
        } else if (mode === 'unit') {
            document.getElementById('unit-container').classList.remove('hidden');
        } else if (mode === 'graph') {
            document.getElementById('graph-container').classList.remove('hidden');
            this.plotGraph();
        }
    }

    plotGraph() {
        if (typeof d3 === 'undefined') {
            alert('Graphing library not loaded.');
            return;
        }
        const container = document.getElementById('graph-plot');
        container.innerHTML = '';
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        const svg = d3.select('#graph-plot')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        let funcStr = this.currentInput.replace(/×/g, '*').replace(/÷/g, '/');
        if (!funcStr.includes('x')) funcStr = 'Math.sin(x)';
        
        document.getElementById('graph-func').innerText = `y = ${funcStr}`;

        const x = d3.scaleLinear().domain([-10, 10]).range([0, width]);
        const y = d3.scaleLinear().domain([-10, 10]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height/2})`).call(d3.axisBottom(x).ticks(5));
        svg.append('g').attr('transform', `translate(${width/2},0)`).call(d3.axisLeft(y).ticks(5));

        const line = d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        const data = [];
        for (let i = -10; i <= 10; i += 0.1) {
            try {
                const val = eval(funcStr.replace(/x/g, `(${i})`).replace(/Math\./g, 'Math.'));
                if (!isNaN(val) && isFinite(val)) data.push([i, val]);
            } catch(e) {}
        }

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--accent-color)')
            .attr('stroke-width', 2)
            .attr('d', line);
    }

    playSound() {
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(() => {});
    }

    handleInput(value) {
        if (this.shouldResetScreen) {
            this.currentInput = '';
            this.shouldResetScreen = false;
        }
        if (this.currentInput === '0' && !isNaN(parseInt(value))) this.currentInput = value;
        else this.currentInput += value;
        this.updateDisplay();
    }

    handleAction(action) {
        switch (action) {
            case 'clear': this.clear(); break;
            case 'delete': this.delete(); break;
            case 'calculate': this.calculate(); break;
            case 'plus-minus': this.toggleSign(); break;
            case 'sqrt': this.applyFunction('Math.sqrt'); break;
            case 'sqr': this.applyFunction('**2'); break;
            case 'sin': this.applyFunction('Math.sin'); break;
            case 'cos': this.applyFunction('Math.cos'); break;
            case 'tan': this.applyFunction('Math.tan'); break;
            case 'log': this.applyFunction('Math.log10'); break;
            case 'ln': this.applyFunction('Math.log'); break;
            case 'fact': this.factorial(); break;
            case 'pi': this.handleInput(Math.PI.toString()); break;
            case 'e': this.handleInput(Math.E.toString()); break;
            case 'mc': this.memory = 0; this.updateMemoryIndicator(); break;
            case 'mr': this.currentInput = this.memory.toString(); this.updateDisplay(); break;
            case 'm-plus': this.calculate(false); this.memory += parseFloat(this.currentInput); this.updateMemoryIndicator(); break;
            case 'm-minus': this.calculate(false); this.memory -= parseFloat(this.currentInput); this.updateMemoryIndicator(); break;
        }
    }

    clear() { this.currentInput = '0'; this.lastExpression = ''; this.updateDisplay(); }
    delete() { this.currentInput = this.currentInput.length > 1 ? this.currentInput.slice(0, -1) : '0'; this.updateDisplay(); }
    toggleSign() { this.currentInput = this.currentInput.startsWith('-') ? this.currentInput.slice(1) : (this.currentInput !== '0' ? '-' + this.currentInput : '0'); this.updateDisplay(); }

    applyFunction(func) {
        try {
            if (func === '**2') this.currentInput = `(${this.currentInput})**2`;
            else this.currentInput = `${func}(${this.currentInput})`;
            this.calculate();
        } catch (e) { this.currentInput = 'Error'; this.updateDisplay(); }
    }

    factorial() {
        const n = parseInt(this.currentInput);
        if (isNaN(n) || n < 0) this.currentInput = 'Error';
        else {
            let res = 1;
            for (let i = 2; i <= n; i++) res *= i;
            this.currentInput = res.toString();
        }
        this.updateDisplay();
    }

    calculate(saveToHistory = true) {
        let expression = this.currentInput.replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
        try {
            const result = eval(expression);
            if (saveToHistory && this.currentInput !== result.toString()) this.addToHistory(this.currentInput, result);
            this.lastExpression = this.currentInput + ' =';
            this.currentInput = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
            this.shouldResetScreen = true;
            this.updateDisplay();
        } catch (e) { this.currentInput = 'Error'; this.updateDisplay(); setTimeout(() => this.clear(), 1500); }
    }

    addToHistory(exp, res) {
        this.history.unshift({ exp, res });
        if (this.history.length > 50) this.history.pop();
        localStorage.setItem('calc_history', JSON.stringify(this.history));
        this.renderHistory();
    }

    renderHistory() {
        this.historyList.innerHTML = this.history.map((item, index) => `
            <div class="history-item" onclick="window.calc.loadHistory(${index})">
                <div class="history-exp">${item.exp}</div>
                <div class="history-res">${item.res}</div>
            </div>
        `).join('');
    }

    loadHistory(index) {
        this.currentInput = this.history[index].res.toString();
        this.lastExpression = this.history[index].exp + ' =';
        this.updateDisplay();
        document.getElementById('history-panel').classList.remove('open');
    }

    updateDisplay() {
        this.displayInput.innerText = this.currentInput;
        this.displayHistory.innerText = this.lastExpression;
    }

    updateMemoryIndicator() {
        this.memoryIndicator.innerText = this.memory !== 0 ? 'M' : '';
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    const calc = new Calculator();
    window.calc = calc;
    lucide.createIcons();
});
