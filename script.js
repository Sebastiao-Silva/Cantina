// BANCO DE DADOS
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

function finalizarVenda() {
    if(db.carrinho.length === 0) return;

    // Baixa no estoque real
    db.carrinho.forEach(itemNoCarrinho => {
        const itemOriginal = db.estoque.find(i => i.id === itemNoCarrinho.id);
        if(itemOriginal) itemOriginal.qtd -= 1;
    });

    // Soma ao total do dia
    const totalVenda = db.carrinho.reduce((sum, item) => sum + item.preco, 0);
    db.vendas_dia += totalVenda;

    // Limpa carrinho e salva
    db.carrinho = [];
    salvarDB();
    renderVendas();
    alert("Venda realizada com sucesso!");
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