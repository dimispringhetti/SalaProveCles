// Importa i moduli necessari
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Console } = require('console');

// Creazione di un'istanza di Express
const app = express();

// Imposta la porta del server
const port = 3000;

// Middleware per gestire i dati JSON
app.use(cors());
app.use(express.json());

app.post('/sendData', (req, res) => {
    const receivedData = req.body.data;
    let responseData;
    // Lettura del file CSV delle prenotazioni
    const bookings = [];
    fs.readFile('data.csv', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            console.log("lesgosky hai sbagliato coglione");
            return;
        }

        // Dividi il contenuto del file in righe
        const lines = data.trim().split('\n');

        // Parsa ogni riga del CSV (escludendo l'intestazione)
        const headers = lines[0].split(',');
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length === headers.length) {
                const booking = {
                    DATA: row[0],
                    ORA_INIZIO: row[1],
                    ORA_FINE: row[2],
                    NOME: row[3],
                    COGNOME: row[4],
                    EMAIL: row[5]
                };
                bookings.push(booking);
            }
        }

        // Verifica la disponibilità della sala per la nuova prenotazione
        const available = isRoomAvailable(receivedData, bookings);

        if (available) {
            const csvData = Object.values(receivedData).join(',') + '\n';

            const filename = 'data.csv';

            fs.appendFile(filename, csvData, (err) => {
                if (err) throw err;
            });

            // Risposta al client "available"
            const responseData = "available";
        } else {
            // Risposta al client "not available"
            console.log("check");
            const responseData = "not available";
        }
    });
    res.json({ response: responseData });
});

// Nuova rotta per gestire i dati del modulo di contatto
app.post('/sendContactData', (req, res) => {
    const contactData = req.body.data;

    // Aggiunta dei dati ricevuti in un file di testo
    fs.appendFile('contactMessages.txt', JSON.stringify(contactData) + '\n', (err) => {
        if (err) {
            console.error(err);
            res.json({ response: 'error' });
            return;
        }
    });
    // stampa a console
    console.log(contactData);
    
    res.json({ response: responseData });
});

// Definizione della rotta per ricevere i dati
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Funzione per verificare la disponibilità della sala
function isRoomAvailable(newBooking, bookings) {
    const { date, startTime, endTime } = newBooking;

    // Converti i tempi in formati compatibili
    const newStartTime = new Date(`${date} ${startTime}`);
    const newEndTime = new Date(`${date} ${endTime}`);

    // Cicla attraverso le prenotazioni esistenti
    for (const booking of bookings) {
        const bookingStartTime = new Date(`${booking.DATA} ${booking.ORA_INIZIO}`);
        const bookingEndTime = new Date(`${booking.DATA} ${booking.ORA_FINE}`);

        // Controlla se c'è sovrapposizione di orari
        if (newStartTime < bookingEndTime && newEndTime > bookingStartTime) {
            return false; // Vi è una sovrapposizione, la sala non è disponibile
        }
    }

    return true; // Nessuna sovrapposizione trovata, la sala è disponibile
}