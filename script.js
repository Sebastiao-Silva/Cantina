// --- CONFIGURAÇÕES GERAIS E SENHA ---
const SENHA_MESTRA = "1234"; // Altere se necessário
const URL_JSON_SUPABASE = "https://hrmjepcajzuvopmuctet.supabase.co/storage/v1/object/public/BearSnack/backup_bear%20(5).json";

// VARIÁVEL GLOBAL DO BANCO DE DATOS (Onde o JSON será carregado)
let db_sessao = {
    estoque: [],
    pessoas: [],
    historico: [],
    config: {}
};

// --- 1. FUNÇÃO DE LOGIN E CARREGAMENTO AUTOMÁTICO ---
async function verificarLogin() {
    const campoSenha = document.getElementById('senha-acesso');
    if (!campoSenha) return;

    const senhaDigitada = campoSenha.value;

    if (senhaDigitada === SENHA_MESTRA) {
        console.log("Login realizado com sucesso no Bear Snack!");
        
        // Libera o acesso visual
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Salva a sessão para não pedir senha no F5
        sessionStorage.setItem('autenticado', 'true');

        // CHAMA O CARREGAMENTO AUTOMÁTICO DO JSON NA NUVEM
        await carregarDadosDaNuvem();
        
    } else {
        const erroMsg = document.getElementById('erro-login');
        if (erroMsg) erroMsg.style.display = 'block';
        campoSenha.value = "";
        campoSenha.focus();
    }
}

// --- 2. FUNÇÃO "LIMPA" PARA PUXAR O JSON COMPLETO ---
async function carregarDadosDaNuvem() {
    try {
        console.log("Conectando ao Supabase Storage...");
        const resposta = await fetch(URL_JSON_SUPABASE);
        
        if (!resposta.ok) throw new Error("Não foi possível acessar o arquivo JSON");

        const dadosCompletos = await resposta.json();
        
        // Alimenta a nossa variável global com TUDO (estoque, pessoas, etc)
        db_sessao = dadosCompletos;
        
        console.log("Banco de dados Bear Snack carregado com sucesso!", db_sessao);
        
        // Atualiza a interface do site com os dados novos
        renderizarTudo();

    } catch (erro) {
        console.error("Erro crítico ao carregar JSON:", erro);
        alert("Erro ao carregar banco de dados da nuvem. Verifique a conexão.");
    }
}

// --- 3. RENDERIZAÇÃO GERAL DA INTERFACE ---
function renderizarTudo() {
    // Esta função centraliza a atualização de todas as abas
    renderVendas();
    
    // Se você tiver funções para outras abas, chame-as aqui:
    // if (typeof renderEstoque === "function") renderEstoque();
    // if (typeof renderClientes === "function") renderClientes();
    
    console.log("Interface atualizada com dados do JSON.");
}

// --- 4. LÓGICA DE VENDAS (ADAPTADA PARA O SEU JSON) ---
let carrinho = [];

function renderVendas() {
    const listaEstoque = document.getElementById('lista-venda-estoque');
    if (!listaEstoque) return;

    // Usa os dados que vieram do JSON (db_sessao.estoque)
    listaEstoque.innerHTML = db_sessao.estoque.map(item => `
        <tr>
            <td>${item.nome} <br><small style="color:gray">Qtd: ${item.qtd}</small></td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td><button class="btn btn-primary" onclick="adicionarAoCarrinho(${item.id})">+</button></td>
        </tr>
    `).join('');

    renderCarrinho();
}

function adicionarAoCarrinho(id) {
    const item = db_sessao.estoque.find(i => i.id === id);
    if (item && item.qtd > 0) {
        carrinho.push({ ...item });
        renderCarrinho();
    } else {
        alert("Produto esgotado ou não encontrado!");
    }
}

function renderCarrinho() {
    const listaCarrinho = document.getElementById('carrinho-corpo');
    if (!listaCarrinho) return;

    let totalCarrinho = 0;
    listaCarrinho.innerHTML = carrinho.map((item, index) => {
        totalCarrinho += item.preco;
        return `<tr>
            <td>${item.nome}</td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="removerDoCarrinho(${index})">x</button></td>
        </tr>`;
    }).join('');

    const totalElemento = document.getElementById('total-carrinho');
    if (totalElemento) totalElemento.innerText = `R$ ${totalCarrinho.toFixed(2)}`;
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    renderCarrinho();
}

// --- 5. FINALIZAR VENDA E ATUALIZAR O BANCO ---
async function finalizarVenda() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    const totalVenda = carrinho.reduce((a, b) => a + b.preco, 0);
    const tipoPagamento = document.getElementById('sel-pagamento').value;
    const clienteId = parseInt(document.getElementById('sel-pessoa').value);

    // 1. Atualiza o estoque na memória (db_sessao)
    for (let itemCarrinho of carrinho) {
        const produtoNoEstoque = db_sessao.estoque.find(p => p.id === itemCarrinho.id);
        if (produtoNoEstoque) {
            produtoNoEstoque.qtd--;
        }
    }

    // 2. Registra no histórico (db_sessao.historico ou vendas)
    const novaVenda = {
        data: new Date().toLocaleString(),
        total: totalVenda,
        tipo: tipoPagamento,
        clienteId: clienteId,
        itens: carrinho.map(c => c.nome).join(', ')
    };

    if (!db_sessao.historico) db_sessao.historico = [];
    db_sessao.historico.push(novaVenda);

    // 3. Limpeza
    carrinho = [];
    alert("Venda realizada com sucesso!");
    
    // 4. ATENÇÃO: Aqui você chamaria a função para salvar de volta no Storage
    // Por enquanto, renderizamos a tela com os novos valores
    renderizarTudo();
}

// --- 6. AUTO-LOGIN E INICIALIZAÇÃO AO CARREGAR PÁGINA ---
window.addEventListener('load', () => {
    // Exibe a data atual no topo
    const dataDisplay = document.getElementById('data-atual');
    if (dataDisplay) dataDisplay.innerText = new Date().toLocaleDateString('pt-br');

    // Verifica se já estava logado
    if (sessionStorage.getItem('autenticado') === 'true') {
        const telaLogin = document.getElementById('tela-login');
        const mainApp = document.getElementById('main-app');
        
        if (telaLogin && mainApp) {
            telaLogin.style.display = 'none';
            mainApp.style.display = 'block';
            carregarDadosDaNuvem(); // Carrega o JSON automaticamente
        }
    }
});

// --- FUNÇÃO AUXILIAR DE NAVEGAÇÃO ---
function mudarAba(id, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const abaAlvo = document.getElementById(id);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
        elemento.classList.add('active');
    }
    
    renderizarTudo(); // Re-renderiza para garantir dados atualizados
}
