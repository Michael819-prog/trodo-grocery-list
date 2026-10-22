import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' });
const dateFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const initial = { name: '', price: '', type: 'regular', expirationDate: '', temperature: '', pictureUrl: '' };

async function api(path, options) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Cannot reach the server. Check that npm run dev is running.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status}). Check that the API server is running.`);
  if (data === null) throw new Error('The server returned an invalid response.');
  return data;
}

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    basket: <><path d="m4 10 2 10h12l2-10H4Z"/><path d="m8 10 4-7 4 7M4 10h16M10 14v3m4-3v3"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    trash: <><path d="M4 7h16M10 4h4m-8 3 1 13h10l1-13M10 11v5m4-5v5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    thermometer: <><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 11v6"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1"/><path d="m21 16-5-5L5 21"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initial);
  const [hideDone, setHideDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    api('/items').then(setItems).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const pending = useMemo(() => items.filter((item) => !item.done), [items]);
  const visible = hideDone ? pending : items;
  const totalCents = pending.reduce((sum, item) => sum + item.priceCents, 0);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function addItem(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const item = await api('/items', { method: 'POST', body: JSON.stringify(form) });
      setItems((current) => [...current, item]);
      setForm(initial);
      document.getElementById('item-name')?.focus();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function changeItem(item, action) {
    if (pendingId) return;
    setPendingId(item.id);
    setError('');
    try {
      if (action === 'remove') {
        await api(`/items/${item.id}`, { method: 'DELETE' });
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      } else {
        const updated = await api(`/items/${item.id}`, { method: 'PATCH', body: JSON.stringify({ done: !item.done }) });
        setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
      }
    } catch (err) { setError(err.message); }
    finally { setPendingId(null); }
  }

  return <div className="page-shell">
    <header className="site-header">
      <div className="brand-mark"><Icon name="basket" size={23} /></div>
      <span className="brand-name">Trodo shop</span>
    </header>

    <main>
      <section className="workspace" aria-label="Grocery list manager">
        <div className="form-column">
          <div className="section-heading"><span className="section-number">01 /</span><h2>Add to list</h2></div>
          <form className="add-form" onSubmit={addItem}>
            <label htmlFor="item-name">Item name <span className="required">*</span></label>
            <input id="item-name" type="text" maxLength="120" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Fresh strawberries" required />

            <div className="field-row">
              <div className="field"><label htmlFor="item-price">Price (€) <span className="required">*</span></label><input id="item-price" type="number" min="0" max="999999.99" step="0.01" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="0.00" required /></div>
              <div className="field"><label htmlFor="item-type">Item type</label><select id="item-type" value={form.type} onChange={(e) => update('type', e.target.value)}><option value="regular">Regular</option><option value="perishable">Perishable</option><option value="consumer">Consumer goods</option></select></div>
            </div>

            {form.type === 'perishable' && <div className="extra-fields"><div className="field"><label htmlFor="expiration">Expiration date <span className="required">*</span></label><input id="expiration" type="date" value={form.expirationDate} onChange={(e) => update('expirationDate', e.target.value)} required /></div><div className="field"><label htmlFor="temperature">Keep-in temperature (°C) <span className="optional">optional</span></label><input id="temperature" type="number" min="-273.15" step="any" value={form.temperature} onChange={(e) => update('temperature', e.target.value)} placeholder="e.g. 4" /></div></div>}
            {form.type === 'consumer' && <div className="extra-fields"><div className="field"><label htmlFor="picture">Picture URL <span className="optional">optional</span></label><input id="picture" type="url" value={form.pictureUrl} onChange={(e) => update('pictureUrl', e.target.value)} placeholder="https://example.com/image.jpg" /></div></div>}
            <button className="add-button" disabled={busy} type="submit"><Icon name="plus" size={20}/>{busy ? 'Adding…' : 'Add to list'}<Icon name="arrow" size={18}/></button>
          </form>
        </div>

        <div className="list-column">
          <div className="list-heading"><div><div className="section-heading"><span className="section-number">02 /</span><h2>Your grocery list</h2></div></div><span className="count-badge">{items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}</span></div>

          <div className="list-toolbar"><span>{pending.length} still to pick up</span><label className="toggle-control"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /><span className="toggle-track"/>Hide completed</label></div>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="items" aria-live="polite">
            {loading ? <div className="empty-state">Loading your list…</div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="basket" size={32}/></div><h3>{items.length ? 'All caught up!' : 'List starts here.'}</h3><p>{items.length ? 'Everything on the list is done. Turn off the filter to see your completed items.' : 'Add your first item.'}</p></div> : visible.map((item) => <article className={`item-card ${item.done ? 'is-done' : ''}`} key={item.id}>
              <button type="button" className="check-button" disabled={pendingId === item.id} aria-label={`${item.done ? 'Mark as pending' : 'Mark as done'}: ${item.name}`} aria-pressed={item.done} onClick={() => changeItem(item, 'toggle')}>{item.done && <Icon name="check" size={15}/>}</button>
              {item.type === 'consumer' && item.pictureUrl && !brokenImages[item.id] && <img className="item-image" src={item.pictureUrl} alt="" onError={() => setBrokenImages((current) => ({ ...current, [item.id]: true }))} />}
              <div className="item-content"><div className="item-title-line"><h3>{item.name}</h3><span className={`type-pill ${item.type}`}>{item.type === 'regular' ? 'GROCERY' : item.type === 'perishable' ? 'PERISHABLE' : 'CONSUMER'}</span></div><div className="item-meta"><span><Icon name="calendar" size={14}/>Added {dateFormat.format(new Date(item.createdAt))}</span>{item.expirationDate && <span><Icon name="calendar" size={14}/>Expires {dateFormat.format(new Date(`${item.expirationDate}T12:00:00`))}</span>}{item.temperature != null && <span><Icon name="thermometer" size={14}/>{item.temperature} °C</span>}{item.pictureUrl && brokenImages[item.id] && <span><Icon name="image" size={14}/>Image unavailable</span>}</div></div>
              <div className="item-actions"><strong>{currency.format(item.priceCents / 100)}</strong><button className="delete-button" type="button" disabled={pendingId === item.id} aria-label={`Remove ${item.name}`} title="Remove item" onClick={() => changeItem(item, 'remove')}><Icon name="trash" size={18}/></button></div>
            </article>)}
          </div>
          <div className="total"><div><span className="total-kicker">CHECKOUT ESTIMATE</span><strong>Pending total</strong><small>Completed items are excluded</small></div><span className="total-price">{currency.format(totalCents / 100)}</span></div>
        </div>
      </section>
    </main>
    <footer>Trodo assignment - Mihails Kica</footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
