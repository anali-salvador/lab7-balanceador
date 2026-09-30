document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  // Avisos (toast): se cierran solos o con el botón.
  document.querySelectorAll('[data-toast]').forEach((toast) => {
    const close = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 250);
    };
    toast.querySelector('[data-toast-close]')?.addEventListener('click', close);
    setTimeout(close, 4500);
  });

  // Al corregir un campo con error, se quita el resaltado.
  document.querySelectorAll('.field.has-error input').forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.closest('.field');
      field.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
      field.querySelector('.field-error')?.remove();
    }, { once: true });
  });

  // Confirmación antes de eliminar.
  const modal = document.getElementById('confirm-modal');
  document.querySelectorAll('form[data-confirm-delete]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (form.dataset.confirmed) return;
      e.preventDefault();
      const name = form.dataset.name || 'este producto';
      if (!modal || typeof modal.showModal !== 'function') {
        if (window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
          form.dataset.confirmed = '1';
          form.submit();
        }
        return;
      }
      modal.querySelector('[data-confirm-name]').textContent = name;
      modal.returnValue = '';
      modal.addEventListener('close', () => {
        if (modal.returnValue === 'confirm') {
          form.dataset.confirmed = '1';
          form.submit();
        }
      }, { once: true });
      modal.showModal();
    });
  });

  // Cerrar el modal al hacer clic fuera de él.
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close('cancel');
  });
});
