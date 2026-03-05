const JORNADA_DIARIA_DEC = 7.333333;

// Executa ao carregar a página
window.onload = () => {
    const salvo = localStorage.getItem('ponto_db');
    if (salvo) {
        aplicarEstado(JSON.parse(salvo));
    } else {
        adicionarLinha();
    }
};

// Abre/Fecha o Modal de Ajuda
function toggleModal() {
    const m = document.getElementById('helpModal');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
}

// Fecha o modal ao clicar fora da caixa branca
window.onclick = function(event) {
    const modal = document.getElementById('helpModal');
    if (event.target == modal) modal.style.display = 'none';
}

// Adiciona uma nova linha na tabela
function adicionarLinha(dados = {}) {
    const tbody = document.getElementById('corpoTabela');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" value="${dados.data || ''}" onchange="salvarAuto()"></td>
        <td><input type="time" class="ponto" value="${dados.e1 || ''}" onchange="calcularLinha(this)"></td>
        <td><input type="time" class="ponto" value="${dados.s1 || ''}" onchange="calcularLinha(this)"></td>
        <td><input type="time" class="ponto" value="${dados.e2 || ''}" onchange="calcularLinha(this)"></td>
        <td><input type="time" class="ponto" value="${dados.s2 || ''}" onchange="calcularLinha(this)"></td>
        <td class="total-dia">00:00</td>
        <td class="extra-dia" data-decimal="0">00:00</td>
        <td class="delete-col"><button onclick="removerLinha(this)" title="Excluir">✕</button></td>
    `;
    tbody.appendChild(tr);
    if (dados.e1) calcularLinha(tr.querySelector('.ponto'));
}

// Converte string "07:20" para decimal 7.33
function timeToDecimal(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h + (m / 60);
}

// Converte decimal 7.33 para string "07:20"
function decimalToTime(dec) {
    if (dec <= 0) return "00:00";
    const h = Math.floor(dec);
    const m = Math.round((dec - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Calcula as horas da linha atual
function calcularLinha(el) {
    const tr = el.closest('tr');
    const pts = tr.querySelectorAll('.ponto');
    if (pts[0].value && pts[1].value && pts[2].value && pts[3].value) {
        const liquido = (timeToDecimal(pts[1].value) - timeToDecimal(pts[0].value)) + 
                        (timeToDecimal(pts[3].value) - timeToDecimal(pts[2].value));
        const extra = Math.max(0, liquido - JORNADA_DIARIA_DEC);
        tr.querySelector('.total-dia').innerText = decimalToTime(liquido);
        tr.querySelector('.extra-dia').innerText = decimalToTime(extra);
        tr.querySelector('.extra-dia').dataset.decimal = extra;
    }
    salvarAuto();
}

// Atualiza os cartões de resumo (Totais)
function atualizarTotais() {
    let totalExtras = 0;
    document.querySelectorAll('.extra-dia').forEach(td => totalExtras += parseFloat(td.dataset.decimal || 0));
    
    const sal = parseFloat(document.getElementById('salario').value) || 0;
    const add = (parseFloat(document.getElementById('porcentagem').value) / 100) + 1;
    const vHoraExtra = (sal / 220) * add;
    const totalExtrasR$ = totalExtras * vHoraExtra;

    document.getElementById('totalHE').innerText = decimalToTime(totalExtras);
    document.getElementById('valorReceber').innerText = `R$ ${totalExtrasR$.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalComSalario').innerText = `R$ ${(sal + totalExtrasR$).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// Salva o estado atual no LocalStorage do navegador
function salvarAuto() {
    const linhas = [];
    document.querySelectorAll('#corpoTabela tr').forEach(tr => {
        const inps = tr.querySelectorAll('input');
        linhas.push({ data: inps[0].value, e1: inps[1].value, s1: inps[2].value, e2: inps[3].value, s2: inps[4].value });
    });
    const estado = { salario: document.getElementById('salario').value, porcentagem: document.getElementById('porcentagem').value, linhas: linhas };
    localStorage.setItem('ponto_db', JSON.stringify(estado));
    atualizarTotais();
}

// Aplica os dados carregados ou importados na interface
function aplicarEstado(estado) {
    document.getElementById('salario').value = estado.salario || 2000;
    document.getElementById('porcentagem').value = estado.porcentagem || 50;
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    estado.linhas.forEach(l => adicionarLinha(l));
    atualizarTotais();
}

// Gera o arquivo .json para download
function exportarDados() {
    const raw = localStorage.getItem('ponto_db');
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ponto_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

// Lê o arquivo .json e carrega na tabela
function importarDados(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            aplicarEstado(JSON.parse(e.target.result));
            salvarAuto();
            input.value = '';
        } catch(err) {
            alert("Erro ao ler o arquivo de backup.");
        }
    };
    reader.readAsText(input.files[0]);
}

// Função para excluir todos os dados da tabela e do LocalStorage
function limparTudo() {
    const confirmacao = confirm("ATENÇÃO: Isso apagará todos os dias lançados e o backup do navegador. Deseja continuar?");
    
    if (confirmacao) {
        // Limpa o LocalStorage
        localStorage.removeItem('ponto_db');
        
        // Limpa a tabela visualmente
        const tbody = document.getElementById('corpoTabela');
        tbody.innerHTML = '';
        
        // Adiciona uma linha em branco para começar de novo
        adicionarLinha();
        
        // Atualiza os cálculos (zerando os totais)
        atualizarTotais();
        
        alert("Dados excluídos com sucesso!");
    }
}

// Remove uma linha específica
function removerLinha(btn) { 
    if(confirm("Deseja excluir este dia?")) {
        btn.closest('tr').remove(); 
        salvarAuto(); 
    }
}