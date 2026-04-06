// --- CONFIGURAÇÃO DE SEGURANÇA E CONEXÃO ---
const SUPABASE_URL = "https://hrmjepcajzuvopmuctet.supabase.co";
// ATENÇÃO: Substitua a string abaixo pela sua chave 'anon' 'public' que está no painel do Supabase
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybWplcGNhanp1dm9wbXVjdGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDA5MjcsImV4cCI6MjA5MTAxNjkyN30.kDHHybmuJJiYCkzHpSOWayHF91TlFLG7Voe8uTdaMlM"; 

// Inicializa o cliente do Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Caminho do seu arquivo JSON no Storage (Mantido para compatibilidade de backup)
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

            // Carrega os dados direto das tabelas do banco
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

// --- 2. CARREGAR DADOS DAS TABELAS (CONEXÃO VIVA) ---
async function carregarDadosDaNuvem() {
    try {
        console.log("Sincronizando com as tabelas do Supabase...");

        // Busca todas as tabelas em paralelo para maior velocidade
        const [resEstoque, resPessoas, resHistorico] = await Promise.all([
            _supabase.from('estoque').select('*').order('nome', { ascending: true }),
            _supabase.from('pessoas').select('*').order('nome', { ascending: true }),
            _supabase.from('historico').select('*').order('id', { ascending: false })
        ]);

        if (resEstoque.error) throw resEstoque.error;
        if (resPessoas.error) throw resPessoas.error;
        if (resHistorico.error) throw resHistorico.error;

        // Atualiza a variável global com os dados reais do banco
        db_sessao.estoque = resEstoque.data || [];
        db_sessao.pessoas = resPessoas.data || [];
        db_sessao.historico = resHistorico.data || [];
        
        console.log("Dados sincronizados do banco:", db_sessao);
        
        renderizarTudo();

    } catch (erro) {
        console.error("Erro ao carregar tabelas do banco:", erro);
        alert("Erro ao sincronizar dados. Verifique a conexão com o banco de dados.");
    }
}

// --- 3. SALVAR BACKUP NO STORAGE (OPCIONAL/SEGURANÇA) ---
async function salvarDadosNaNuvem() {
    try {
        console.log("Gerando backup no Storage...");
        
        const jsonString = JSON.stringify(db_sessao);
        const blob = new Blob([jsonString], { type: 'application/json' });

        const { data, error } = await _supabase.storage
            .from(BUCKET_NAME)
            .upload(FILE_NAME, blob, {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;
        console.log("Backup em JSON atualizado no Storage.");

    } catch (erro) {
        console.error("Erro ao gerar backup no Storage:", erro);
    }
}

// --- 4. RENDERIZAÇÃO DA INTERFACE ---
function renderizarTudo() {
    renderVendas();
    // Funções auxiliares para outras abas (se existirem)
    if (typeof renderEstoque === "function") renderEstoque();
    if (typeof renderClientes === "function") renderClientes();
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
            <td>R$ ${Number(item.preco).toFixed(2)}</td>
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

// --- 5. FINALIZAR VENDA E SINCRONIZAR BANCO ---
async function finalizarVenda() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    const totalVenda = carrinho.reduce((a, b) => a + Number(b.preco), 0);
    const tipoPagamento = document.getElementById('sel-pagamento').value;
    const clienteId = parseInt(document.getElementById('sel-pessoa').value);

    try {
        // 1. Atualiza o estoque no banco (Tabela 'estoque')
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

        // 2. Registra no histórico do banco (Tabela 'historico')
        const novaVenda = {
            data: new Date().toLocaleString('pt-BR'),
            total: totalVenda,
            tipo: tipoPagamento,
            clienteId: clienteId,
            itens: carrinho.map(c => c.nome).join(', ')
        };

        await _supabase.from('historico').insert([novaVenda]);

        // 3. Limpa o carrinho e atualiza localmente
        carrinho = [];
        alert("Venda Finalizada com Sucesso!");
        
        // Recarrega os dados do banco para garantir sincronia
        await carregarDadosDaNuvem();
        
        // Gera um backup em JSON no Storage por segurança
        salvarDadosNaNuvem();

    } catch (err) {
        console.error("Erro ao finalizar venda:", err);
        alert("Erro ao gravar venda no banco de dados.");
    }
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
