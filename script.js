

window.addEventListener('DOMContentLoaded', () => {

  const sidebar = document.querySelector('.sidebar');
  const btnMobile  = document.getElementById('toggle-sidebar-mobile');
  
  function toggle() {
    sidebar.classList.toggle('visible');
  }
  
  btnMobile.addEventListener('click',  toggle);

  let items   = JSON.parse(localStorage.getItem('currentQuote')) || [];
  let history = JSON.parse(localStorage.getItem('quotes')) || [];

  const inpFirst = document.getElementById('client-firstname');
  const inpLast  = document.getElementById('client-lastname');
  const inpPhone = document.getElementById('client-phone');
  const inpTitle = document.getElementById('quote-title');

  const menuItems = document.querySelectorAll('.menu li');
  const pages     = document.querySelectorAll('.page');
  const tbody     = document.querySelector('#items-table tbody');
  const totalEl   = document.getElementById('grand-total');

  // Affiche la page principale (Devis / Historique / Documents)
  function showPage(page) {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    menuItems.forEach(li => li.classList.remove('active'));
    document.querySelector(`.menu li[data-page="${page}"]`).classList.add('active');

    window.location.hash = page;

    if (page === 'devis')      renderTable();
    if (page === 'historique') renderHistory();
  }

  // Initialisation de la nav principale
  menuItems.forEach(li => {
    li.addEventListener('click', () => {
      showPage(li.dataset.page);
    });
  });

  // Page initiale (hash ou premier onglet)
  const initial = location.hash ? location.hash.slice(1) : menuItems[0].dataset.page;
  showPage(initial);

  // --- Devis ---
  document.getElementById('add-item').addEventListener('click', () => {
    items.push({ produit: '', price: 0, qty: 1 });
    saveCurrent();
    appendRow(items.length - 1);
    updateTotals();
    focusLast();
  });
  document.getElementById('generate-image').addEventListener('click', () => {
    saveCurrent();
    saveQuote();
    regenQuoteByData(history[history.length - 1]);
  });

  function renderTable() {
    tbody.innerHTML = '';
    items.forEach((_, i) => appendRow(i));
    updateTotals();
  }

  function appendRow(i) {
    const it = items[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" data-index="${i}" class="inp-prod" value="${it.produit}"></td>
      <td><input type="number" data-index="${i}" class="inp-price" value="${it.price}" min="0"></td>
      <td><input type="number" data-index="${i}" class="inp-qty" value="${it.qty}" min="0"></td>
      <td class="cell-total">${(it.price * it.qty).toLocaleString()} €</td>
      <td class="actions"><button class="btn-delete" data-index="${i}"><i class="fas fa-trash-alt"></i></button></td>
    `;
    tbody.appendChild(tr);

    ['prod','price','qty'].forEach(type => {
      tr.querySelector(`.inp-${type}`).addEventListener('input', e => {
        const idx = e.target.dataset.index;
        if (type === 'prod')  items[idx].produit = e.target.value;
        if (type === 'price') items[idx].price   = parseFloat(e.target.value) || 0;
        if (type === 'qty')    items[idx].qty     = parseInt(e.target.value)   || 0;
        e.target.closest('tr').querySelector('.cell-total')
          .textContent = (items[idx].price * items[idx].qty).toLocaleString() + ' €';
        updateTotals();
        saveCurrent();
      });
    });

    tr.querySelector('.btn-delete').addEventListener('click', e => {
      items.splice(e.target.closest('button').dataset.index, 1);
      saveCurrent();
      renderTable();
    });
  }

  function updateTotals() {
    totalEl.textContent = items.reduce((s, it) => s + it.price * it.qty, 0)
      .toLocaleString() + ' €';
  }

  function focusLast() {
    const last = tbody.querySelector('tr:last-child input');
    if (last) last.focus();
  }

  function saveCurrent() {
    localStorage.setItem('currentQuote', JSON.stringify(items));
  }

  function saveQuote() {
    const q = {
      id: Date.now(),
      date: Date.now(),
      items: JSON.parse(JSON.stringify(items)),
      client: {
        first: inpFirst.value,
        last:  inpLast.value,
        phone: inpPhone.value,
        title: inpTitle.value
      },
      sigDirData: null,
      sigClientData: null
    };
    history.push(q);
    localStorage.setItem('quotes', JSON.stringify(history));
  }

  // --- Historique ---
  function renderHistory() {
    const ul = document.getElementById('devis-list');
    ul.innerHTML = '';
    history.forEach(q => {
      const d  = new Date(q.date);
      const li = document.createElement('li');
      li.innerHTML = `
        <span>#${q.id} – ${d.toLocaleDateString()} ${d.toLocaleTimeString()}</span>
        <div>
          <button class="btn-load"    data-id="${q.id}"><i class="fas fa-sync-alt"></i> Charger</button>
          <button class="btn-generate" data-id="${q.id}"><i class="fas fa-file-export"></i> Générer</button>
          <button class="btn-del"      data-id="${q.id}"><i class="fas fa-trash-alt"></i> Supprimé</button>
        </div>
      `;
      ul.appendChild(li);
    });
    document.querySelectorAll('.btn-load').forEach(b => b.addEventListener('click', loadQuote));
    document.querySelectorAll('.btn-generate').forEach(b => {
      b.addEventListener('click', e => {
        regenQuoteByData(history.find(h => h.id == e.target.closest('button').dataset.id));
      });
    });
    document.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', delHist));
  }

  function loadQuote(e) {
    const q = history.find(h => h.id == e.target.closest('button').dataset.id);
    items = JSON.parse(JSON.stringify(q.items));
    inpFirst.value = q.client.first;
    inpLast.value  = q.client.last;
    inpPhone.value = q.client.phone;
    inpTitle.value = q.client.title;
    saveCurrent();
    showPage('devis');
  }

  function delHist(e) {
    history = history.filter(h => h.id != e.target.closest('button').dataset.id);
    localStorage.setItem('quotes', JSON.stringify(history));
    renderHistory();
  }

  // --- Navigation interne Documents (Réglementation / Procédure) ---
  function setupDocNav() {
    const tabs     = document.querySelectorAll('.doc-nav li');
    const articles = document.querySelectorAll('.doc-article');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // 1) bascule d'onglet actif
        document.querySelector('.doc-nav .doc-active').classList.remove('doc-active');
        tab.classList.add('doc-active');
        // 2) masque tous les articles
        articles.forEach(a => a.style.display = 'none');
        // 3) affiche l'article ciblé
        document.getElementById(tab.dataset.doc).style.display = '';
      });
    });
  }

  // --- Génération via html2canvas ---
  function regenQuoteByData(q) {
    const cont = document.createElement('div');
    Object.assign(cont.style, {
      background: '#fff',
      padding:    '2rem',
      width:      '800px',
      margin:     'auto'
    });
    cont.innerHTML = generateQuoteHTML(q);

    if (q.sigDirData || q.sigClientData) {
      const sigDiv = document.createElement('div');
      sigDiv.style = 'display:flex; justify-content:space-between; margin-top:2rem;';
      sigDiv.innerHTML = `
        <div style="text-align:center; flex:1;">
          <p><strong>Signature de l'entreprise</strong></p>
          ${q.sigDirData    ? `<img src="${q.sigDirData}" style="width:350px;"/>` : ''}
        </div>
        <div style="text-align:center; flex:1;">
          <p><strong>Signature du client</strong></p>
          ${q.sigClientData ? `<img src="${q.sigClientData}" style="width:350px;"/>` : ''}
        </div>
      `;
      cont.appendChild(sigDiv);
    }

    document.body.appendChild(cont);
    html2canvas(cont).then(canvas => {
      const link = document.createElement('a');
      link.download = `devis_${q.id}.png`;
      link.href     = canvas.toDataURL();
      link.click();
      document.body.removeChild(cont);
    });
  }

  function generateQuoteHTML(q) {
    const d = new Date(q.date);
    return `
      <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h2 style="margin:0;">Devis #${q.id}</h2>
          <p style="margin:0;">${d.toLocaleDateString()} ${d.toLocaleTimeString()}</p>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <img src="" alt="Logo GPE" style="width:120px; height:auto; margin-bottom:0.5rem;"/>
          <h3 style="margin:0;">${q.client.title || ''}</h3>
          <p style="margin:0;">${q.client.first} ${q.client.last}</p>
          <p style="margin:0;">${q.client.phone}</p>
        </div>
      </div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:1rem;">
        <thead>
          <tr>
            <th style="border-bottom:1px solid #ddd; padding:8px; text-align:left;">Produit</th>
            <th style="border-bottom:1px solid #ddd; padding:8px; text-align:right;">Prix U.N</th>
            <th style="border-bottom:1px solid #ddd; padding:8px; text-align:right;">Quantité</th>
            <th style="border-bottom:1px solid #ddd; padding:8px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${q.items.map(it => `
            <tr>
              <td style="padding:8px;">${it.produit}</td>
              <td style="padding:8px; text-align:right;">${it.price.toLocaleString()} €</td>
              <td style="padding:8px; text-align:right;">${it.qty}</td>
              <td style="padding:8px; text-align:right;">${(it.price * it.qty).toLocaleString()} €</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px; font-weight:bold; border-top:1px solid #ddd; text-align:right;">
              TOTAL
            </td>
            <td style="padding:8px; text-align:right; font-weight:bold; border-top:1px solid #ddd;">
              ${q.items.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()} €
            </td>
          </tr>
        </tfoot>
      </table>
      <div style="margin-top:1.5rem; font-style:italic;">
        <p><strong>LA DIRECTION</strong></p>
        <p style="margin-bottom:1.5rem;">
          Nous restons à votre entière disposition pour toute précision ou ajustement concernant ce devis. En vous remerciant chaleureusement pour votre confiance, nous serions ravis de mettre notre savoir-faire à votre service afin de faire de votre événement un moment unique, à la hauteur de vos attentes. Au plaisir de collaborer avec vous pour concrétiser ce projet."

        </p>
        <p>
          <strong>Grand Paris Évènement</strong> // Rue de Saint Charles · 75000 Paris
        </p>
      </div>
    `;
  }

  // Lancement de la navigation interne Documents
  setupDocNav();
});
