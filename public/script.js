// Format Functions
const formatCurrency = (val) => {
    if (!val || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatNumber = (val) => {
    if (!val || isNaN(val)) return '0';
    return new Intl.NumberFormat('pt-BR').format(val);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR').format(new Date(d.getTime() + d.getTimezoneOffset() * 60000));
};

let currentTab = 'fev';
let globalData = null;
let revChartInstance = null;
let splitChartInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            globalData = data;
            renderDashboard();
        })
        .catch(err => {
            console.error("Error loading data:", err);
            document.getElementById('view-title').innerText = "Erro ao carregar dados";
        });

    // Tab Navigation
    document.querySelectorAll('nav a').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.getAttribute('data-tab');
            renderDashboard();
        });
    });
});

function renderDashboard() {
    if (!globalData) return;

    const dataSet = currentTab === 'fev' ? globalData.fev : globalData.historico;
    
    // Update Header
    document.getElementById('view-title').innerText = currentTab === 'fev' 
        ? 'Desempenho: Fevereiro 2026' 
        : 'Desempenho: Últimos 6 Meses';
    
    // Calculate KPIs
    let totalRev = 0, totalOrd = 0, totalInv = 0, totalSessions = 0;
    
    dataSet.forEach(row => {
        totalRev += Number(row['Receita captada geral'] || row['Receita total'] || 0);
        totalOrd += Number(row['Pedidos captados'] || row['Pedidos total'] || 0);
        totalInv += Number(row['INVEST TOTAL'] || row['Investimento Total'] || 0);
        totalSessions += Number(row['Sessões'] || row['Sessões Total'] || 0);
    });

    document.getElementById('kpi-receita').innerText = formatCurrency(totalRev);
    document.getElementById('kpi-pedidos').innerText = formatNumber(totalOrd);
    document.getElementById('kpi-inv').innerText = formatCurrency(totalInv);
    document.getElementById('kpi-sessoes').innerText = totalSessions > 0 ? formatNumber(totalSessions) : 'N/A';

    // Render Table
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    
    dataSet.forEach(row => {
        const tr = document.createElement('tr');
        const dateLab = currentTab === 'fev' ? formatDate(row['Data']) : row['Mês'];
        
        tr.innerHTML = `
            <td>${dateLab}</td>
            <td style="font-weight: 500; color: var(--accent);">${formatCurrency(row['Receita captada geral'] || row['Receita total'])}</td>
            <td>${formatCurrency(row['Receita cap eletro'] || row['Receita Eletro'])}</td>
            <td>${formatCurrency(row['Receita cap alimentos'] || row['Receita Alimentos'])}</td>
            <td>${formatNumber(row['Pedidos captados'] || row['Pedidos total'])}</td>
            <td>${formatCurrency(row['INVEST TOTAL'] || row['Investimento Total'])}</td>
        `;
        tbody.appendChild(tr);
    });

    renderCharts(dataSet);
}

function renderCharts(dataSet) {
    const labels = dataSet.map(row => currentTab === 'fev' ? formatDate(row['Data']) : row['Mês']);
    const revTotal = dataSet.map(row => Number(row['Receita captada geral'] || row['Receita total'] || 0));
    
    const revEletro = dataSet.map(row => Number(row['Receita cap eletro'] || row['Receita Eletro'] || 0));
    const revAlim = dataSet.map(row => Number(row['Receita cap alimentos'] || row['Receita Alimentos'] || 0));

    // Global Chart Defaults
    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = 'Inter';

    // Main Chart
    const ctxRev = document.getElementById('revenueChart').getContext('2d');
    if (revChartInstance) revChartInstance.destroy();

    const gradientRev = ctxRev.createLinearGradient(0, 0, 0, 400);
    gradientRev.addColorStop(0, 'rgba(35, 134, 54, 0.4)');
    gradientRev.addColorStop(1, 'rgba(35, 134, 54, 0.0)');

    revChartInstance = new Chart(ctxRev, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Receita Total',
                data: revTotal,
                borderColor: '#238636',
                borderWidth: 2,
                backgroundColor: gradientRev,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#238636',
                pointBorderColor: '#0a0c10',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 24, 32, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { callback: function(value) { return 'R$ ' + (value/1000).toFixed(0) + 'k'; } }
                },
                x: {
                    grid: { display: false, drawBorder: false }
                }
            }
        }
    });

    // Split Chart
    const ctxSplit = document.getElementById('splitChart').getContext('2d');
    if (splitChartInstance) splitChartInstance.destroy();

    const totalEletro = revEletro.reduce((a, b) => a + b, 0);
    const totalAlim = revAlim.reduce((a, b) => a + b, 0);

    splitChartInstance = new Chart(ctxSplit, {
        type: 'doughnut',
        data: {
            labels: ['Eletro', 'Alimentos'],
            datasets: [{
                data: [totalEletro, totalAlim],
                backgroundColor: ['#1f6feb', '#f85149'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 24, 32, 0.9)',
                    callbacks: {
                        label: function(context) {
                            return ' ' + formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });
}
