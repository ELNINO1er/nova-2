export function normalizeCiPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00225')) digits = digits.slice(5);
  else if (digits.startsWith('225')) digits = digits.slice(3);
  return digits;
}

export function isValidCiPhone(value) {
  return normalizeCiPhone(value).length === 10;
}
