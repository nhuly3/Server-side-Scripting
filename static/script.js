document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  const input = document.getElementById('ticker-input');
  const clearBtn = document.getElementById('clear-btn');
  const errorDiv = document.getElementById('error-message');
  const tabs = document.querySelectorAll('.tab-btn');
  const content = document.getElementById('tab-content');
  let stockData = null;

  form.addEventListener('submit', e => {
    e.preventDefault();
    errorDiv.textContent = '';
    if (!input.value.trim()) {
      input.reportValidity();
      return;
    }
    fetch(`/api/stock/${input.value.trim().toUpperCase()}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(json => {
        stockData = json.data;
        activateTab('outlook');
        renderOutlook();
      })
      .catch(() => {
        errorDiv.textContent = 'Error : No record has been found, please enter a valid symbol.';
      });
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    errorDiv.textContent = '';
    content.innerHTML = '';
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active')) return;
      activateTab(tab.dataset.tab);
      if (!stockData && tab.dataset.tab !== 'history') return;
      if (tab.dataset.tab === 'history') {
        renderHistory();
      } else if (tab.dataset.tab === 'outlook') {
        renderOutlook();
      } else if (tab.dataset.tab === 'summary') {
        renderSummary();
      }
    });
  });

  function activateTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  }

  function renderOutlook() {
    const c = stockData.company;
    const rows = [
      { label: 'Company Name', value: c.name },
      { label: 'Stock Ticker Symbol', value: c.ticker },
      { label: 'Exchange Code', value: c.exchangeCode },
      { label: 'Start Date', value: c.startDate },
      { label: 'Description', value: c.description, class: 'desc-cell' }
    ];
    renderTable(rows);
  }

  function renderSummary() {
    const s = stockData.stock;
    const changeNum = s.last - s.prevClose;
    const changeVal = changeNum.toFixed(2);
    const arrow = changeNum >= 0 ? '▲' : '▼';
    const cls = changeNum >= 0 ? 'change-positive' : 'change-negative';
    const rows = [
      { label: 'Stock Ticker Symbol', value: s.ticker },
      { label: 'Trading Day', value: s.timestamp.split('T')[0] },
      { label: 'Previous Closing Price', value: s.prevClose },
      { label: 'Opening Price', value: s.open },
      { label: 'High Price', value: s.high },
      { label: 'Low Price', value: s.low },
      { label: 'Last Price', value: s.last },
      { label: 'Change', value: `${changeVal} ${arrow}`, class: cls },
      { label: 'Change Percent', value: `${((changeNum / s.prevClose) * 100).toFixed(2)}% ${arrow}`, class: cls },
      { label: 'Number of Shares Traded', value: s.volume }
    ];
    renderTable(rows);
  }

  function renderHistory() {
    fetch('/history')
      .then(res => res.json())
      .then(hist => {
        let html = '<table><thead><tr><th>Stock Ticker Symbol</th><th>Search Timestamp</th></tr></thead><tbody>';
        hist.forEach(h => {
          html += `<tr><td>${h.ticker}</td><td>${h.timestamp}</td></tr>`;
        });
        html += '</tbody></table>';
        content.innerHTML = html;
      });
  }

  // ← Here’s the updated renderTable
  function renderTable(rows) {
    let html = '<table><tbody>';
    rows.forEach(r => {
      const tdClass = r.class ? ` class="${r.class}"` : '';
      html += `<tr>
        <th>${r.label}</th>
        <td${tdClass}>${r.value}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    content.innerHTML = html;
  }
});
