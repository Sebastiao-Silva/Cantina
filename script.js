// --- CONFIGURAÇÃO DE SEGURANÇA E CONEXÃO ---
const SUPABASE_URL = "https://hrmjepcajzuvopmuctet.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybWplcGNhanp1dm9wbXVjdGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDA5MjcsImV4cCI6MjA5MTAxNjkyN30.kDHHybmuJJiYCkzHpSOWayHF91TlFLG7Voe8uTdaMlM"; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variáveis globais para o estado do App
let db_sessao = {
    estoque: [],
    pessoas: [],
    historico: [],
    config: {}
};

let carrinho = [];

// --- 1. FUNÇÃO DE LOGIN COM VALIDAÇÃO ---
async function verificarLogin() {
    const campoSenha = document.getElementById('senha-acesso');
    if (!campoSenha) return;

    const senhaDigitada = campoSenha.value;

    try {
        const { data, error } = await _supabase
            .from('configuracoes')
            .select('valor')
            .eq('chave', 'senha_mestre')
            .single();

        if (error) throw new Error("Erro ao conectar com tabela de configurações.");

        if (data && senhaDigitada === data.valor) {
            console.log("Login autorizado!");
            document.getElementById('tela-login').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            sessionStorage.setItem('autenticado', 'true');

            // CHAMA A CARGA DOS DADOS DAS TABELAS
            await carregarDadosDaNuvem();
            
        } else {
            const erroMsg = document.getElementById('erro-login');
            if (erroMsg) erroMsg.style.display = 'block';
            alert("Senha incorreta!");
            campoSenha.value = "";
            campoSenha.focus();
        }
    } catch (err) {
        console.error("Erro no login:", err);
    }
}

// --- 2. CARREGAR DADOS DAS TABELAS (AQUI SUBSTITUÍMOS O JSON) ---
async function carregarDadosDaNuvem() {
    try {
        console.log("Buscando dados das tabelas do Supabase...");

        // Buscamos as 3 tabelas que o seu JSON tinha, mas agora direto do banco
        const [resEstoque, resPessoas, resHistorico] = await Promise.all([
            _supabase.from('estoque').select('*').order('nome', { ascending: true }),
            _supabase.from('pessoas').select('*').order('nome', { ascending: true }),
            _supabase.from('historico').select('*').order('id', { ascending: false })
        ]);

        if (resEstoque.error) throw resEstoque.error;
        if (resPessoas.error) throw resPessoas.error;
        if (resHistorico.error) throw resHistorico.error;

        // Alimentamos a variável local com o que veio do banco
        db_sessao.estoque = resEstoque.data || [];
        db_sessao.pessoas = resPessoas.data || [];
        db_sessao.historico = resHistorico.data || [];
        
        console.log("Dados carregados com sucesso!", db_sessao);
        
        // Atualiza a tela
        renderizarTudo();

    } catch (erro) {
        console.error("Erro ao sincronizar tabelas:", erro);
        alert("Erro ao carregar dados do banco de dados.");
    }
}

// --- 3. RENDERIZAÇÃO DA INTERFACE ---
function renderizarTudo() {
    renderVendas();
    renderListaPessoas(); // Garante que a lista de clientes/alunos apareça
    console.log("Interface renderizada.");
}

function renderVendas() {
    const listaEstoque = document.getElementById('lista-venda-estoque');
    if (!listaEstoque) return;

    if (!db_sessao.estoque || db_sessao.estoque.length === 0) {
        listaEstoque.innerHTML = "<tr><td colspan='3'>Estoque não encontrado no banco.</td></tr>";
        return;
    }

    listaEstoque.innerHTML = db_sessao.estoque.map(item => `
        <tr>
            <td>${item.nome} <br><small style="color:gray">Qtd: ${item.qtd} | ${item.sigla || ''}</small></td>
            <td>R$ ${Number(item.preco).toFixed(2)}</td>
            <td><button class="btn btn-primary" onclick="adicionarAoCarrinho(${item.id})">+</button></td>
        </tr>
    `).join('');

    renderCarrinho();
}

// Função para preencher o SELECT de pessoas (Clientes/Alunos)
function renderListaPessoas() {
    const selectPessoa = document.getElementById('sel-pessoa');
    if (!selectPessoa) return;

    selectPessoa.innerHTML = '<option value="">Selecione o Cliente/Aluno</option>' + 
        db_sessao.pessoas.map(p => `
            <option value="${p.id}">${p.nome} (${p.tipo})</option>
        `).join('');
}

function adicionarAoCarrinho(id) {
    const item = db_sessao.estoque.find(i => i.id === id);
    if (item && item.qtd > 0) {
        carrinho.push({ ...item });
        renderCarrinho();
    } else {
        alert("Produto esgotado!");
    }
}

function renderCarrinho() {
    const listaCarrinho = document.getElementById('carrinho-corpo');
    if (!listaCarrinho) return;

    let totalCarrinho = 0;
    listaCarrinho.innerHTML = carrinho.map((item, index) => {
        totalCarrinho += Number(item.preco);
        return `<tr>
            <td>${item.nome}</td>
            <td>R$ ${Number(item.preco).toFixed(2)}</td>
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

// --- 4. FINALIZAR VENDA (ATUALIZA O BANCO NA HORA) ---
async function finalizarVenda() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    const totalVenda = carrinho.reduce((a, b) => a + Number(b.preco), 0);
    const tipoPagamento = document.getElementById('sel-pagamento').value;
    const clienteId = parseInt(document.getElementById('sel-pessoa').value);

    try {
        // 1. Dá baixa no estoque no banco de dados
        for (let itemCarrinho of carrinho) {
            const { data: prod } = await _supabase
                .from('estoque')
                .select('qtd')
                .eq('id', itemCarrinho.id)
                .single();
            
            if (prod) {
                await _supabase
                    .from('estoque')
                    .update({ qtd: prod.qtd - 1 })
                    .eq('id', itemCarrinho.id);
            }
        }

        // 2. Insere a venda no histórico do banco
        const novaVenda = {
            data: new Date().toLocaleString('pt-BR'),
            total: totalVenda,
            tipo: tipoPagamento,
            clienteId: clienteId,
            itens: carrinho.map(c => c.nome).join(', ')
        };

        await _supabase.from('historico').insert([novaVenda]);

        carrinho = [];
        alert("Venda Finalizada e Banco de Dados Atualizado!");
        
        // Recarrega tudo para mostrar os novos valores
        await carregarDadosDaNuvem();

    } catch (err) {
        console.error("Erro ao finalizar venda:", err);
        alert("Erro ao gravar venda no banco.");
    }
}

// --- 5. INICIALIZAÇÃO ---
window.addEventListener('load', () => {
    const dataDisplay = document.getElementById('data-atual');
    if (dataDisplay) dataDisplay.innerText = new Date().toLocaleDateString('pt-br');

    if (sessionStorage.getItem('autenticado') === 'true') {
        const telaLogin = document.getElementById('tela-login');
        const mainApp = document.getElementById('main-app');
        
        if (telaLogin && mainApp) {
            telaLogin.style.display = 'none';
            mainApp.style.display = 'block';
            carregarDadosDaNuvem(); 
        }
    }
});

function mudarAba(id, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const abaAlvo = document.getElementById(id);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
        elemento.classList.add('active');
    }
    renderizarTudo();
}
