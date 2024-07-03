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

        // Controlla se la data è nel futuro
        if (!dateInFuture(startTime, date)) {
            alert('La data e l\'ora devono essere nel futuro.');
            return;
        }

        // Validazione email
        if (!isValidEmail(email)) {
            alert('Inserire un indirizzo email valido.');
            return;
        }

        // salvataggio dati in un oggetto json
        const data = {
            date: date,
            startTime: startTime,
            endTime: endTime,
            firstName: firstName,
            lastName: lastName,
            email: email
        };

        // invio dati al server
        const answer = await sendData(data);

        // Se il server risponde con successo mostra un messaggio di conferma
        if (answer === "available") {
            // Crea un messaggio di conferma
            const confirmationMessage = `
            Prenotazione confermata!
            ti arriverà una mail di conferma con i dettagli della prenotazione e il codice di ingresso.

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
        }
        // Se il server risponde con errore mostra un messaggio di errore
        else {
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

        // Controlla se hidden-input è vuoto
        if (hiddenInput !== '') {
            return;
        }

        // Validazione email
        if (!isValidEmail(email)) {
            alert('Inserire un indirizzo email valido.');
            return;
        }

        // salvataggio dati in un oggetto json
        const data = {
            name: name,
            email: email,
            message: message
        };

        // invio dati al server
        const answer = await sendContactData(data);

        // se il server risponde con successo mostra un messaggio di conferma
        if (answer === "success") {
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

// Funzione per inviare i dati al server
async function sendData(data) {
    const response = await fetch('http://localhost:3000/sendData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: data })
    });

    // attesa risposta
    const responseData = await response.json();

    // restituisce la risposta come stringa
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

    // attesa risposta
    const responseData = await response.json();

    // restituisce la risposta come stringa
    return responseData.response;
}
