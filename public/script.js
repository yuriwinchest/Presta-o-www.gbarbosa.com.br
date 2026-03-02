// ─── FORMAT HELPERS ───────────────────────────────────────
const R = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const N = (v) => new Intl.NumberFormat('pt-BR').format(Math.round(v || 0));
const fmtDate = (s) => {
    if (!s) return '—';
    const d = new Date(s);
    return new Intl.DateTimeFormat('pt-BR').format(new Date(d.getTime() + d.getTimezoneOffset() * 60000));
};

// ─── STATE ────────────────────────────────────────────────
let globalData = null;
let currentTab = 'hist';
const charts = {};

// ─── CHART.JS GLOBAL DEFAULTS ─────────────────────────────
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = '#9E7E5A';

const PALETTE = {
    orange:  { line: '#F77A16', fill: 'rgba(247,122,22,0.12)' },
    red:     { line: '#E85D04', fill: 'rgba(232,93,4,0.10)' },
    green:   { line: '#2DC653', fill: 'rgba(45,198,83,0.10)' },
    blue:    { line: '#1F6FEB', fill: 'rgba(31,111,235,0.10)' },
    purple:  { line: '#8957E5', fill: 'rgba(137,87,229,0.10)' },
    teal:    { line: '#14B8A6', fill: 'rgba(20,184,166,0.10)' },
};

function makeDataset(label, data, color, fill = true) {
    return {
        label,
        data,
        borderColor: color.line,
        backgroundColor: fill ? color.fill : color.line,
        borderWidth: 2.5,
        fill,
        tension: 0.4,
        pointBackgroundColor: color.line,
        pointRadius: 4,
        pointHoverRadius: 7,
    };
}

function baseOpts(yFmt) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'bottom', labels: { padding: 18, boxWidth: 12, usePointStyle: true } },
            tooltip: {
                backgroundColor: '#1A1208',
                titleColor: '#FDF5ED',
                bodyColor: 'rgba(255,255,255,0.75)',
                borderColor: 'rgba(247,122,22,0.4)',
                borderWidth: 1,
                padding: 14,
                callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${yFmt(ctx.raw)}` },
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 45 } },
            y: {
                grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                ticks: { callback: yFmt },
            },
        },
    };
}

function destroyAndCreate(id, cfg) {
    if (charts[id]) charts[id].destroy();
    const canvas = document.getElementById(id);
    if (!canvas) return;
    charts[id] = new Chart(canvas, cfg);
}

// ─── MAIN RENDER ──────────────────────────────────────────
function renderDashboard() {
    if (!globalData) return;
    const isHist = currentTab === 'hist';
    const ds = isHist ? [...globalData.historico].reverse() : globalData.fev;

    const labels    = ds.map(r => isHist ? r['Mês'] : fmtDate(r['Data']));
    const recTotal  = ds.map(r => Number(r['Receita total'] || r['Receita captada geral'] || 0));
    const recEletro = ds.map(r => Number(r['Receita Eletro'] || r['Receita cap eletro'] || 0));
    const recAlim   = ds.map(r => Number(r['Receita Alimentos'] || r['Receita cap alimentos'] || 0));
    const invTotal  = ds.map(r => Number(r['Investimento Total'] || r['INVEST TOTAL'] || 0));
    const invEletro = ds.map(r => Number(r['Investimento eletro'] || r['INVEST. ELETRO'] || 0));
    const invAlim   = ds.map(r => Number(r['Investimento Alimentos'] || r['INVEST. ALIMENTOS'] || 0));
    const sessTotal = ds.map(r => Number(r['Sessões Total'] || r['Sessões'] || 0));
    const sessMid   = ds.map(r => Number(r['Sessões Mídia'] || 0));
    const pedTotal  = ds.map(r => Number(r['Pedidos total'] || r['Pedidos captados'] || 0));
    const pedEletro = ds.map(r => Number(r['Pedidos eletro'] || r['Pedidos cap eletro'] || 0));
    const pedAlim   = ds.map(r => Number(r['Pedidos Alimentos'] || r['Pedidos cap alimentos'] || 0));

    // ── Hero KPIs (Feb 2026 from historic) ──
    const feb = globalData.historico.find(r => r['Mês'] === 'Feb 2026') || {};
    const jan = globalData.historico.find(r => r['Mês'] === 'Jan 2026') || {};
    const trend = (a, b) => {
        if (!b || !a) return '';
        const p = ((a - b) / b * 100).toFixed(1);
        return (a >= b ? '▲ +' : '▼ ') + p + '% vs Jan';
    };

    document.getElementById('hkpi-receita').textContent = R(feb['Receita total']);
    document.getElementById('hkpi-inv').textContent     = R(feb['Investimento Total']);
    document.getElementById('hkpi-sess').textContent    = N(feb['Sessões Total']);
    document.getElementById('hkpi-ped').textContent     = N(feb['Pedidos total']);

    const setTrend = (id, cur, prev, isUp) => {
        const el = document.getElementById(id);
        const pct = prev ? ((cur - prev) / prev * 100).toFixed(1) : '—';
        const up = cur >= prev;
        el.textContent = (up ? '▲ +' : '▼ ') + pct + '% vs Jan';
        el.className = 'hkpi-trend ' + (up ? 'trend-up' : 'trend-down');
    };
    setTrend('hkpi-receita-trend', feb['Receita total'], jan['Receita total']);
    setTrend('hkpi-inv-trend', feb['Investimento Total'], jan['Investimento Total']);
    setTrend('hkpi-sess-trend', feb['Sessões Total'], jan['Sessões Total']);
    setTrend('hkpi-ped-trend', feb['Pedidos total'], jan['Pedidos total']);

    // ── CHART: Investimento ──
    destroyAndCreate('chartInvest', {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { ...makeDataset('Inv. Total', invTotal, PALETTE.orange, false), type: 'line', fill: true, backgroundColor: PALETTE.orange.fill },
                { ...makeDataset('Inv. Eletro', invEletro, PALETTE.red, false), type: 'bar', backgroundColor: PALETTE.red.line, barPercentage: 0.5 },
                { ...makeDataset('Inv. Alimentos', invAlim, PALETTE.teal, false), type: 'bar', backgroundColor: PALETTE.teal.line, barPercentage: 0.5 },
            ],
        },
        options: { ...baseOpts((v) => 'R$ ' + (v / 1000).toFixed(0) + 'k'), scales: { ...baseOpts().scales, x: { grid: { display: false }, stacked: false } } },
    });

    // ── CHART: Receita ──
    destroyAndCreate('chartReceita', {
        type: 'line',
        data: {
            labels,
            datasets: [
                makeDataset('Receita Total', recTotal, PALETTE.green),
                makeDataset('Receita Eletro', recEletro, PALETTE.blue),
                makeDataset('Receita Alimentos', recAlim, PALETTE.purple),
            ],
        },
        options: baseOpts((v) => 'R$ ' + (v / 1000).toFixed(0) + 'k'),
    });

    // ── CHART: Sessões ──
    destroyAndCreate('chartSessoes', {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { ...makeDataset('Sessões Total', sessTotal, PALETTE.blue, false), type: 'line', fill: true, backgroundColor: PALETTE.blue.fill },
                { ...makeDataset('Sessões Mídia', sessMid, PALETTE.orange, false), type: 'bar', backgroundColor: PALETTE.orange.line, barPercentage: 0.5 },
            ],
        },
        options: baseOpts(N),
    });

    // ── CHART: Pedidos ──
    destroyAndCreate('chartPedidos', {
        type: 'line',
        data: {
            labels,
            datasets: [
                makeDataset('Pedidos Total', pedTotal, PALETTE.purple),
                makeDataset('Ped. Eletro', pedEletro, PALETTE.blue),
                makeDataset('Ped. Alimentos', pedAlim, PALETTE.teal),
            ],
        },
        options: baseOpts(N),
    });

    // ── CHART: Correlação (uses historic regardless) ──
    const histR = [...globalData.historico].reverse();
    const corrLabels = histR.map(r => r['Mês']);
    const corrInv    = histR.map(r => Number(r['Investimento Total'] || 0));
    const corrRec    = histR.map(r => Number(r['Receita total'] || 0));

    destroyAndCreate('chartCorr', {
        type: 'bar',
        data: {
            labels: corrLabels,
            datasets: [
                { ...makeDataset('Investimento', corrInv, PALETTE.orange, false), type: 'bar', backgroundColor: PALETTE.orange.line, yAxisID: 'y', barPercentage: 0.5 },
                { ...makeDataset('Receita', corrRec, PALETTE.green, false), type: 'line', fill: true, backgroundColor: PALETTE.green.fill, yAxisID: 'y2' },
            ],
        },
        options: {
            ...baseOpts(),
            plugins: { ...baseOpts().plugins, legend: { position: 'bottom', labels: { padding: 18, boxWidth: 12, usePointStyle: true } } },
            scales: {
                x:  { grid: { display: false } },
                y:  { position: 'left',  ticks: { callback: (v) => 'R$ ' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'Investimento' } },
                y2: { position: 'right', ticks: { callback: (v) => 'R$ ' + (v/1000000).toFixed(1) + 'M' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Receita' } },
            },
        },
    });

    // ── CHART: Mix Doughnut ──
    const lastFeb = globalData.historico.find(r => r['Mês'] === 'Feb 2026') || {};
    destroyAndCreate('chartMix', {
        type: 'doughnut',
        data: {
            labels: ['Eletro', 'Alimentos'],
            datasets: [{
                data: [lastFeb['Receita Eletro'] || 0, lastFeb['Receita Alimentos'] || 0],
                backgroundColor: [PALETTE.blue.line, PALETTE.teal.line],
                borderWidth: 0,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 18, boxWidth: 12, usePointStyle: true } },
                tooltip: { callbacks: { label: (ctx) => `  ${ctx.label}: ${R(ctx.raw)}` } },
            },
        },
    });

    // ── TABLE ──
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    ds.forEach(r => {
        const period = isHist ? r['Mês'] : fmtDate(r['Data']);
        const rec  = Number(r['Receita total'] || r['Receita captada geral'] || 0);
        const rEl  = Number(r['Receita Eletro'] || r['Receita cap eletro'] || 0);
        const rAl  = Number(r['Receita Alimentos'] || r['Receita cap alimentos'] || 0);
        const ped  = Number(r['Pedidos total'] || r['Pedidos captados'] || 0);
        const inv  = Number(r['Investimento Total'] || r['INVEST TOTAL'] || 0);
        const sess = Number(r['Sessões Total'] || r['Sessões'] || 0);
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td><strong>${period}</strong></td>
                <td class="td-rec">${R(rec)}</td>
                <td>${R(rEl)}</td>
                <td>${R(rAl)}</td>
                <td>${N(ped)}</td>
                <td class="td-inv">${R(inv)}</td>
                <td>${sess ? N(sess) : '—'}</td>
            </tr>
        `);
    });
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(r => r.json())
        .then(data => {
            globalData = data;
            renderDashboard();
        })
        .catch(err => {
            console.error('Erro ao carregar dados:', err);
        });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderDashboard();
        });
    });
});
