document.addEventListener('DOMContentLoaded', () => {
  let pazienteGrafico = null;

  // Funzione per mostrare toast
  function showToast(message, isError = false) {
    const toastEl = document.getElementById('notificationToast');
    const toastBody = toastEl.querySelector('.toast-body');

    toastBody.textContent = message;

    if (isError) {
      toastEl.classList.remove('bg-success', 'text-white');
      toastEl.classList.add('bg-danger', 'text-white');
    } else {
      toastEl.classList.remove('bg-danger', 'text-white');
      toastEl.classList.add('bg-success', 'text-white');
    }

    const toast = new bootstrap.Toast(toastEl, {
      autohide: true,
      delay: 5000,
    });
    toast.show();
  }

  // Gestione modal dettagli paziente
  document.querySelectorAll('.btn-dettagli-paziente').forEach((button) => {
    button.addEventListener('click', function () {
      const pazienteId = this.getAttribute('data-paziente-id');
      const nome = this.getAttribute('data-paziente-nome');
      const cognome = this.getAttribute('data-paziente-cognome');
      const dataNascita = this.getAttribute('data-paziente-data-nascita');
      const email = this.getAttribute('data-paziente-email');

      document.getElementById('paziente-nome').textContent = nome;
      document.getElementById('paziente-cognome').textContent = cognome;
      document.getElementById('paziente-data-nascita').textContent = dataNascita;
      document.getElementById('paziente-email').textContent = email;

      if (pazienteGrafico) {
        pazienteGrafico.destroy();
        pazienteGrafico = null;
      }

      fetch(`/admin/pazienti/${pazienteId}/misurazioni`)
        .then((response) => response.json())
        .then((misurazioni) => {
          if (misurazioni && misurazioni.length > 0) {
            const labels = misurazioni.map((m) => m.dataFormattata);
            const values = misurazioni.map((m) => m.misura);
            pazienteGrafico = window.createWeightChart('pazienteChart', labels, values);
          } else {
            pazienteGrafico = window.createWeightChart('pazienteChart', [], []);
          }
        })
        .catch((error) => {
          console.error('Errore nel caricamento delle misurazioni:', error);
        });
      const modalDettagliPaziente = new bootstrap.Modal(
        document.getElementById('pazienteDetailsModal'),
      );
      modalDettagliPaziente.show();
    });
  });

  document.getElementById('pazienteDetailsModal').addEventListener('hidden.bs.modal', () => {
    if (pazienteGrafico) {
      pazienteGrafico.destroy();
      pazienteGrafico = null;
    }
  });

  // Gestione creazione nuovo piano alimentare per pulsante inline
  const btnNuovoPianoInline = document.getElementById('btn-nuovo-piano-inline');
  if (btnNuovoPianoInline) {
    btnNuovoPianoInline.addEventListener('click', function () {
      const pazienteId = this.getAttribute('data-paziente-id');
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('piano-utente-id').value = pazienteId;
      document.getElementById('piano-data').value = today;
      const modalNuovoPiano = new bootstrap.Modal(document.getElementById('nuovoPianoModal'));
      modalNuovoPiano.show();
    });
  }

  // Salvataggio nuovo piano alimentare
  const salvaPianoBtn = document.getElementById('salva-piano-btn');
  if (salvaPianoBtn) {
    salvaPianoBtn.addEventListener('click', () => {
      const utenteId = document.getElementById('piano-utente-id').value;
      const titolo = document.getElementById('piano-titolo').value.trim();
      const descrizione = document.getElementById('piano-descrizione').value.trim();
      const data = document.getElementById('piano-data').value;

      if (!utenteId || !titolo || !data || !descrizione) {
        showToast(
          'Per favore, compila tutti i campi obbligatori (Titolo, Data, Descrizione).',
          true,
        );
        return;
      }

      const giorni = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
      const pasti = ['colazione', 'pranzo', 'cena'];

      const contenuto = {};

      giorni.forEach((giorno) => {
        contenuto[giorno] = {};
        pasti.forEach((pasto) => {
          const fieldName = `${giorno}_${pasto}`;
          const field = document.getElementsByName(fieldName)[0];
          contenuto[giorno][pasto] = field ? field.value.trim() : '';
        });
      });

      const pianoData = {
        utenteId,
        titolo,
        descrizione,
        data,
        contenuto: JSON.stringify(contenuto),
      };

      fetch('/admin/piani-alimentari/nuovo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify(pianoData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showToast('Piano alimentare creato con successo!');
            const modalNuovoPiano = bootstrap.Modal.getInstance(
              document.getElementById('nuovoPianoModal'),
            );
            modalNuovoPiano.hide();
            setTimeout(() => window.location.reload(), 2000);
          } else {
            console.error('Errore nella creazione del piano:', data);
            showToast(
              'Errore nella creazione del piano alimentare: ' +
                (data.error || 'Errore sconosciuto'),
              true,
            );
          }
        })
        .catch((error) => {
          console.error('Errore nella creazione del piano alimentare:', error);
          showToast('Errore di connessione durante la creazione del piano alimentare', true);
        });
    });
  }

  // Gestione visualizzazione piani alimentari in modal
  document.querySelectorAll('.btn-visualizza-piano-admin').forEach((button) => {
    button.addEventListener('click', function () {
      const pianoId = this.getAttribute('data-piano-id');
      const titolo = this.getAttribute('data-piano-titolo');
      const data = this.getAttribute('data-piano-data');
      const descrizione = this.getAttribute('data-piano-descrizione');

      document.getElementById('dettaglio-piano-titolo').textContent = titolo;
      document.getElementById('dettaglio-piano-data').textContent = `Data: ${data}`;
      document.getElementById('dettaglio-piano-descrizione').textContent =
        descrizione || 'Nessuna descrizione disponibile.';

      fetch(`/admin/piani-alimentari/${pianoId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Errore nella risposta: ${response.status}`);
          }
          return response.json();
        })
        .then((piano) => {
          renderDettaglioPiano(piano.contenuto);
          const visualizzaPianoModal = new bootstrap.Modal(
            document.getElementById('visualizzaPianoModal'),
          );
          visualizzaPianoModal.show();
        })
        .catch((error) => {
          console.error('Errore nel caricamento del piano:', error);
          showToast('Errore nel caricamento dei dettagli del piano alimentare', true);
        });
    });
  });

  // Funzione per renderizzare il contenuto del piano nel modal
  function renderDettaglioPiano(contenutoJSON) {
    const contenuto = typeof contenutoJSON === 'string' ? JSON.parse(contenutoJSON) : contenutoJSON;
    const giorni = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

    giorni.forEach((giorno) => {
      const elementoGiorno = document.getElementById(`dettaglio-giorno-${giorno}`);
      if (elementoGiorno) {
        elementoGiorno.style.display = 'none';
      }
    });

    for (const giorno of giorni) {
      if (contenuto[giorno]) {
        const elementoGiorno = document.getElementById(`dettaglio-giorno-${giorno}`);
        if (elementoGiorno) {
          elementoGiorno.style.display = 'block';
          const pasti = ['colazione', 'pranzo', 'cena'];
          pasti.forEach((pasto) => {
            const elementoPasto = document.getElementById(`dettaglio-${giorno}-${pasto}`);
            if (elementoPasto) {
              elementoPasto.textContent = contenuto[giorno][pasto] || 'Non specificato';
            }
          });
        }
      }
    }
  }

  // Gestione eliminazione utenti
  document.querySelectorAll('[data-elimina="utente"]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const utenteId = this.dataset.itemId;
      document.getElementById('utenteId').value = utenteId;
      document.getElementById('eliminaUtenteForm').action = '/admin/utenti/elimina?_method=DELETE';
      const modal = new bootstrap.Modal(document.getElementById('eliminaUtenteModal'));
      modal.show();
    });
  });

  // Gestione eliminazione piani alimentari
  document.querySelectorAll('[data-elimina="piano"]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const pianoId = this.dataset.itemId;
      document.getElementById('pianoId').value = pianoId;
      document.getElementById('eliminaPianoForm').action =
        '/admin/piani-alimentari/elimina?_method=DELETE';
      const modal = new bootstrap.Modal(document.getElementById('eliminaPianoModal'));
      modal.show();
    });
  });

  // Gestione eliminazione recensioni
  document.querySelectorAll('[data-elimina="recensione"]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const recensioneId = this.dataset.itemId;
      document.getElementById('recensioneId').value = recensioneId;
      document.getElementById('eliminaRecensioneForm').action =
        '/admin/recensioni/elimina?_method=DELETE';
      const modal = new bootstrap.Modal(document.getElementById('eliminaRecensioneModal'));
      modal.show();
    });
  });

  // Gestione eliminazione richieste contatto
  document.querySelectorAll('[data-elimina="richiesta"]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const richiestaId = this.dataset.itemId;
      document.getElementById('richiestaId').value = richiestaId;
      document.getElementById('eliminaRichiestaForm').action =
        '/admin/contatti/elimina?_method=DELETE';
      const modal = new bootstrap.Modal(document.getElementById('eliminaRichiestaModal'));
      modal.show();
    });
  });
});
