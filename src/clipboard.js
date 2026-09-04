/**
 * Kopiowanie z fallbackiem: navigator.clipboard nie istnieje poza secure
 * context, czyli m.in. po otwarciu zbudowanego pliku dwuklikiem (file://).
 */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // np. brak zgody użytkownika — próbujemy starą drogą
    }
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:-2000px;left:0;opacity:0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  } catch {
    return false;
  }
}
