// --- CONFIGURAÇÃO DE SEGURANÇA E CONEXÃO ---
const SUPABASE_URL = "https://hrmjepcajzuvopmuctet.supabase.co";
// ATENÇÃO: Substitua a string abaixo pela sua chave 'anon' 'public' que está no painel do Supabase
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybWplcGNhanp1dm9wbXVjdGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDA5MjcsImV4cCI6MjA5MTAxNjkyN30.kDHHybmuJJiYCkzHpSOWayHF91TlFLG7Voe8uTdaMlM"; 

// Inicializa o cliente do Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Caminho do seu arquivo JSON no Storage
const BUCKET_NAME = 'BearSnack';
const FILE_NAME = 'backup_bear (5).json';
const URL_JSON_SUPABASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${FILE_NAME}`;

// VARIÁVEL GLOBAL DO BANCO DE DATOS (Estado atual do sistema)
let db_sessao = {
    estoque: [],
    pessoas: [],
    historico: [],
    config: {}
};

let carrinho = [];

// --- 1. FUNÇÃO DE LOGIN COM VALIDAÇÃO NO BANCO ---
async function verificarLogin() {
    const campoSenha = document.getElementById('senha-acesso');
    if (!campoSenha) return;

    const senhaDigitada = campoSenha.value;

    try {
        // Busca a senha na tabela 'configuracoes' que você criou
        const { data, error } = await _supabase
            .from('configuracoes')
            .select('valor')
            .eq('chave', 'senha_mestre')
            .single();

        if (error) throw new Error("Erro ao conectar com tabela de configurações.");

        if (data && senhaDigitada === data.valor) {
            console.log("Login realizado com sucesso no Bear Snack!");
            
            // Libera o acesso visual
            document.getElementById('tela-login').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            
            // Salva a sessão para não pedir senha no F5
            sessionStorage.setItem('autenticado', 'true');

            // Carrega os dados do arquivo JSON
            await carregarDadosDaNuvem();
            
        } else {
            const erroMsg = document.getElementById('erro-login');
            if (erroMsg) erroMsg.style.display = 'block';
            alert("Senha incorreta!");
            campoSenha.value = "";
            campoSenha.focus();
        }
    } catch (err) {
        console.error("Erro no processo de login:", err);
        alert("Erro técnico ao validar acesso.");
    }
}

// --- 2. CARREGAR JSON DO STORAGE (IMPORTAR) ---
async function carregarDadosDaNuvem() {
    try {
        console.log("Baixando banco de dados do Storage...");
        // Adicionamos um timestamp para evitar que o navegador use uma versão antiga (cache)
        const resposta = await fetch(`${URL_JSON_SUPABASE}?t=${new Date().getTime()}`);
        
        if (!resposta.ok) throw new Error("Arquivo JSON não encontrado no Storage.");

        const dadosCompletos = await resposta.json();
        
        // Atualiza a variável global
        db_sessao = dadosCompletos;
        
        console.log("Dados carregados:", db_sessao);
        
        renderizarTudo();

    } catch (erro) {
        console.error("Erro ao carregar JSON:", erro);
        alert("Atenção: O sistema não conseguiu carregar o arquivo de backup da nuvem.");
    }
}

// --- 3. SALVAR JSON NO STORAGE (EXPORTAR/SOBRESCREVER) ---
async function salvarDadosNaNuvem() {
    try {
        console.log("Salvando alterações na nuvem...");
        
        // Converte o objeto global de volta para texto JSON
        const jsonString = JSON.stringify(db_sessao);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Faz o upload para o Storage com 'upsert: true' para substituir o arquivo antigo
        const { data, error } = await _supabase.storage
            .from(BUCKET_NAME)
            .upload(FILE_NAME, blob, {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;
        console.log("Backup atualizado com sucesso!");

    } catch (erro) {
        console.error("Erro ao salvar na nuvem:", erro);
        alert("Erro ao sincronizar os dados. As alterações foram feitas apenas localmente.");
    }
}

// --- 4. RENDERIZAÇÃO DA INTERFACE ---
function renderizarTudo() {
    renderVendas();
    // Aqui você pode adicionar outras funções de renderização conforme necessário
    console.log("Interface atualizada.");
}

function renderVendas() {
    const listaEstoque = document.getElementById('lista-venda-estoque');
    if (!listaEstoque) return;

    if (!db_sessao.estoque || db_sessao.estoque.length === 0) {
        listaEstoque.innerHTML = "<tr><td colspan='3'>Estoque vazio ou não carregado.</td></tr>";
        return;
    }

    listaEstoque.innerHTML = db_sessao.estoque.map(item => `
        <tr>
            <td>${item.nome} <br><small style="color:gray">Qtd: ${item.qtd} | ${item.sigla || ''}</small></td>
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
        alert("Produto esgotado!");
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

// --- 5. FINALIZAR VENDA E SINCRONIZAR ---
async function finalizarVenda() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    const totalVenda = carrinho.reduce((a, b) => a + b.preco, 0);
    const tipoPagamento = document.getElementById('sel-pagamento').value;
    const clienteId = parseInt(document.getElementById('sel-pessoa').value);

    // 1. Atualiza o estoque na memória local
    for (let itemCarrinho of carrinho) {
        const produtoNoEstoque = db_sessao.estoque.find(p => p.id === itemCarrinho.id);
        if (produtoNoEstoque) {
            produtoNoEstoque.qtd--;
        }
    }

    // 2. Registra no histórico global
    const novaVenda = {
        data: new Date().toLocaleString('pt-BR'),
        total: totalVenda,
        tipo: tipoPagamento,
        clienteId: clienteId,
        itens: carrinho.map(c => c.nome).join(', ')
    };

    if (!db_sessao.historico) db_sessao.historico = [];
    db_sessao.historico.push(novaVenda);

    // 3. Limpa o carrinho
    carrinho = [];
    
    // 4. Salva o novo estado do JSON na nuvem (Sobrescreve o arquivo)
    await salvarDadosNaNuvem();

    alert("Venda Finalizada e Nuvem Atualizada!");
    renderizarTudo();
}

// --- 6. INICIALIZAÇÃO ---
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
