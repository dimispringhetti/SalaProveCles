document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();  // Evita l'invio del modulo

        const date = document.getElementById('date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const email = document.getElementById('email').value;
        const hiddenInput = document.getElementById('hidden-input').value;

        // Controlla se hiddenInput è vuoto
        if (hiddenInput !== '') {
            return;
        }

        // Controlla se l'ora di inizio è prima dell'ora di fine
        if (!startEndTime(startTime, endTime)) {
            alert('L\'ora di inizio deve essere prima dell\'ora di fine.');
            return;
        }

        // Controlla se la data è nel futuro e se è valida
        if (!dateInFuture(startTime, date) || !validCharacters(date) || !validCharacters(startTime) || !validCharacters(endTime)) {
            alert('La data e l\'ora devono essere nel futuro e devono coincidere il formato richiesto.');
            return;
        }

        // Validazione email
        if (!isValidEmail(email)) {
            alert('Inserire un indirizzo email valido.');
            return;
        }

        // Validazione nome e cognome
        if (!validCharacters(firstName) || !validCharacters(lastName)) {
            alert('Nome e cognome non possono contenere caratteri speciali.');
            return;
        }

        // Salvataggio dati in un oggetto JSON
        const data = {
            date: date,
            startTime: startTime,
            endTime: endTime,
            firstName: firstName,
            lastName: lastName,
            email: email
        };

        // Invio dati al server
        const answer = await sendData(data);
        if (answer === "not logged") {
            alert('Effettua il login nelle modalità indicate per prenotare la sala.');
            return;
        } else if (answer === "available") {
            // Crea un messaggio di conferma
            const confirmationMessage = `
            Prenotazione confermata!
            Ti arriverà una mail di conferma con i dettagli della prenotazione e il codice di ingresso.

            Data: ${date}
            Ora di Inizio: ${startTime}
            Ora di Fine: ${endTime}
            Nome: ${firstName} ${lastName}
            Email: ${email}
            `;

            // Mostra il messaggio di conferma
            alert(confirmationMessage);

            // Reset del modulo
            bookingForm.reset();
        } else {
            alert('Data e ora non disponibili, prova con un altro orario.');
            return;
        }
    });

    const contactForm = document.getElementById('contactForm');
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();  // Evita l'invio del modulo

        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;
        const hiddenInput = document.getElementById('hidden-input').value;

        // Controlla se hiddenInput è vuoto
        if (hiddenInput !== '') {
            return;
        }

        // Validazione email
        if (!isValidEmail(email)) {
            alert('Inserire un indirizzo email valido.');
            return;
        }

        // Salvataggio dati in un oggetto JSON
        const data = {
            name: name,
            email: email,
            message: message
        };

        // Invio dati al server
        const answer = await sendContactData(data);

        // Se il server risponde con successo mostra un messaggio di conferma
        if (answer.response === 'success') {
            alert('Messaggio inviato con successo!');

            // Reset del modulo
            contactForm.reset();
        } else {
            alert('Si è verificato un errore, riprova più tardi.');
        }
    });
});

// Funzione per validare l'email
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Funzione per controllare se l'ora di inizio è prima dell'ora di fine
function startEndTime(startTime, endTime) {
    return startTime < endTime;
}

// Funzione per controllare se la data è nel futuro
function dateInFuture(startTime, date) {
    const currentDate = new Date();
    const selectedDate = new Date(date + 'T' + startTime);
    return currentDate < selectedDate;
}

// Funzione per controllare se ci sono caratteri speciali
function validCharacters(input) {
    const regex = /^[a-zA-Z0-9\s]*$/;
    return regex.test(input);
}

// Funzione per inviare i dati al server
async function sendData(data) {
    const response = await fetch('http://localhost:3000/sendData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: data })
    });

    // Attesa risposta
    const responseData = await response.json();

    // Restituisce la risposta come stringa
    return responseData.response;
}

// Funzione per inviare il messaggio di contatto al server
async function sendContactData(data) {
    const response = await fetch('http://localhost:3000/sendContactData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: data })
    });

    // Attesa risposta
    const responseData = await response.json();

    // Restituisce la risposta come stringa
    return responseData.response;
}
