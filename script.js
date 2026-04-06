// --- FUNÇÃO DE LOGIN (ADICIONE ISSO) ---
function verificarLogin() {
    // 1. Pega o que foi digitado no campo de senha
    const campoSenha = document.getElementById('senha-acesso');
    if (!campoSenha) return; // Segurança caso o ID esteja diferente

    const senhaDigitada = campoSenha.value;

    // 2. Compara com a sua senha 1234
    if (senhaDigitada === SENHA_MESTRA) {
        // Libera o acesso visual
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Salva que você logou para não pedir senha de novo ao atualizar (F5)
        sessionStorage.setItem('autenticado', 'true');
        
async function carregarDadosAutomatico() {
    const urlJSON = "SUA_URL_PUBLICA_DO_SUPABASE_AQUI";

    try {
        const resposta = await fetch(urlJSON);
        const dadosCompletos = await resposta.json();
        
        // Agora o 'dadosCompletos' tem TUDO: estoque, pessoas, vendas...
        console.log("Banco de dados carregado com sucesso!", dadosCompletos);
        
        // Chama a sua função que já existe
        renderizarTudo(dadosCompletos); 
    } catch (erro) {
        console.error("Erro ao carregar o JSON da nuvem:", erro);
    }
}

// Chame essa função logo após o login ou no window.onload}
}

    // 3. Se funcionou, ele manda os dados para a função que desenha na tela
    // OBS: Verifique se o nome da sua função de desenho é 'exibirProdutos' ou similar
    if (typeof exibirProdutos === "function") {
        exibirProdutos(data); 
    }
}
        
        console.log("Login realizado com sucesso no Bear Snack!");
    } else {
        // Se errar a senha
        const erroMsg = document.getElementById('erro-login');
        if (erroMsg) erroMsg.style.display = 'block';
        campoSenha.value = "";
        campoSenha.focus();
    }
}

// --- AUTO-LOGIN (OPCIONAL, MAS RECOMENDADO) ---
// Se você já logou, ele pula a tela de senha automaticamente ao abrir o app
window.addEventListener('load', () => {
    if (sessionStorage.getItem('autenticado') === 'true') {
        const telaLogin = document.getElementById('tela-login');
        const mainApp = document.getElementById('main-app');
        
        if (telaLogin && mainApp) {
            telaLogin.style.display = 'none';
            mainApp.style.display = 'block';
            if (typeof renderizarTudo === "function") renderizarTudo();
        }
    }
});// BANCO DE DADOS
let db = JSON.parse(localStorage.getItem('bear_snack_db')) || {
    estoque: [
        { id: 1, nome: 'SALGADO ASSADO', qtd: 20, preco: 8.50 },
        { id: 2, nome: 'SUCO NATURAL', qtd: 15, preco: 6.00 },
        { id: 3, nome: 'BOLO DE POTE', qtd: 8, preco: 10.00 }
    ],
    vendas_dia: 0,
    carrinho: []
};

function salvarDB() { localStorage.setItem('bear_snack_db', JSON.stringify(db)); }

// NAVEGAÇÃO
function mudarAba(id, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    elemento.classList.add('active');
    if(id === 'vendas') renderVendas();
    if(id === 'estoque') renderEstoque();
}

// RENDERIZAR PDV (VENDAS)
function renderVendas() {
    // 1. Renderiza produtos disponíveis
    const listaEstoque = document.getElementById('lista-venda-estoque');
    listaEstoque.innerHTML = db.estoque.map(item => `
        <tr>
            <td>${item.nome} <br><small style="color:var(--text-dim)">Qtd: ${item.qtd}</small></td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td><button class="btn btn-primary" onclick="adicionarAoCarrinho(${item.id})">+</button></td>
        </tr>
    `).join('');

    // 2. Renderiza carrinho
    const listaCarrinho = document.getElementById('carrinho-corpo');
    let totalCarrinho = 0;
    listaCarrinho.innerHTML = db.carrinho.map((item, index) => {
        totalCarrinho += item.preco;
        return `<tr>
            <td>${item.nome}</td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="removerDoCarrinho(${index})">x</button></td>
        </tr>`;
    }).join('');

    document.getElementById('total-carrinho').innerText = `R$ ${totalCarrinho.toFixed(2)}`;
    document.getElementById('resumo-vendas').innerText = `R$ ${db.vendas_dia.toFixed(2)}`;
}

// AÇÕES DO PDV
function adicionarAoCarrinho(id) {
    const item = db.estoque.find(i => i.id === id);
    if(item.qtd > 0) {
        db.carrinho.push({...item});
        renderVendas();
    } else {
        alert("Produto esgotado!");
    }
}

function removerDoCarrinho(index) {
    db.carrinho.splice(index, 1);
    renderVendas();
}

async function finalizarVenda() {
    if(!carrinho.length) return;
    const t = carrinho.reduce((a,b)=>a+b.preco,0);
    const pag = document.getElementById('sel-pagamento').value;
    const pid = parseInt(document.getElementById('sel-pessoa').value);
    
    // Lógica de Data Retroativa
    const dataInput = document.getElementById('data-retroativa').value;
    const dataFinal = dataInput ? new Date(dataInput).toLocaleString() : new Date().toLocaleString();

    const p = pid !== 0 ? await buscar("pessoas", pid) : {nome: "AVULSO", divida: 0};
    
    if(pag === 'FIADO' && pid === 0) return alert("Selecione um cliente para fiado!");

    for(let it of carrinho) {
        const prod = await buscar("estoque", it.id);
        if(prod) { prod.qtd--; await salvar("estoque", prod); }
    }

    if(pag === 'FIADO') { p.divida += t; await salvar("pessoas", p); }

    await salvar("historico", {
        data: dataFinal,
        total: t,
        tipo: `${pag}: ${p.nome} (${carrinho.map(c=>c.sigla).join(',')})`,
        clienteId: pid,
        obs: document.getElementById('obs-venda').value
    });
    
    somVenda.currentTime = 0;
    somVenda.play().catch(e => console.log("Erro som"));
    
    // Limpeza
    carrinho = []; 
    document.getElementById('obs-venda').value=""; 
    document.getElementById('data-retroativa').value=""; // Limpa a data após vender
    renderizarTudo(); 
    alert("Venda Finalizada!");
}


// INICIALIZAÇÃO
window.onload = () => {
    renderVendas();
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-br');
};
// --- CONFIGURAÇÃO DO BANCO DE DATOS (IndexedDB) ---
const dbNome = "BearSnackDB";
const dbVersao = 1;
let db;

const request = indexedDB.open(dbNome, dbVersao);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    // Cria as tabelas (Object Stores)
    if (!db.objectStoreNames.contains("estoque")) db.createObjectStore("estoque", { keyPath: "id" });
    if (!db.objectStoreNames.contains("clientes")) db.createObjectStore("clientes", { keyPath: "id" });
    if (!db.objectStoreNames.contains("vendas")) db.createObjectStore("vendas", { keyPath: "id", autoIncrement: true });
    console.log("Tabelas do BD criadas com sucesso!");
};

request.onsuccess = (e) => {
    db = e.target.result;
    console.log("Banco de Dados Conectado!");
    carregarDadosDoBD(); // Puxa os dados para a tela
};

// --- FUNÇÃO PARA SALVAR NO BANCO ---
function salvarNoBD(tabela, objeto) {
    const transaction = db.transaction([tabela], "readwrite");
    const store = transaction.objectStore(tabela);
    store.put(objeto); 
}
