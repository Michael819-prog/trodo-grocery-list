export class ValidationError extends Error {}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateItem(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Enter an item.');
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 120) throw new ValidationError('Name must be 1–120 characters.');

  const price = String(input.price ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(price)) {
    throw new ValidationError('Price must be between 0 and 999999.99 with at most two decimals.');
  }
  const [whole, fraction = ''] = price.split('.');
  const priceCents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  const type = input.type ?? 'regular';
  if (!['regular', 'perishable', 'consumer'].includes(type)) {
    throw new ValidationError('Choose a valid item type.');
  }
  const item = { name, priceCents, type };
  if (type === 'perishable') {
    if (!validDate(input.expirationDate)) {
      throw new ValidationError('Enter a valid expiration date.');
    }
    item.expirationDate = input.expirationDate;
    if (input.temperature !== '' && input.temperature != null) {
      const temperature = Number(input.temperature);
      if (typeof input.temperature === 'boolean' || !Number.isFinite(temperature) || temperature < -273.15) {
        throw new ValidationError('Temperature must be a number of at least −273.15 °C.');
      }
      item.temperature = temperature;
    }
  }
  if (type === 'consumer' && input.pictureUrl != null && input.pictureUrl !== '') {
    try {
      const url = new URL(input.pictureUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.href.length > 2048) throw new Error();
      item.pictureUrl = url.href;
    } catch {
      throw new ValidationError('Picture URL must be a valid http or https URL.');
    }
  }
  return item;
}
