// Carica le variabili d'ambiente dal file .env
require('dotenv').config();

// Importa i moduli necessari
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Dati dell'amministratore da variabili d'ambiente
const adminMail = process.env.ADMIN_MAIL;
const adminMailPassword = process.env.ADMIN_MAIL_PASSWORD;

// Creazione di un'istanza di Express
const app = express();

// Imposta la porta del server
const port = 3000;

// Middleware per gestire i dati JSON
app.use(cors());
app.use(express.json());

app.post('/sendData', (req, res) => {
    const receivedData = req.body.data;

    // Lettura del file CSV delle prenotazioni
    const bookings = [];
    fs.readFile('data.csv', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.json({ response: 'error reading file' });
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
        let responseData;

        if (available) {

            const csvData = Object.values(receivedData).join(',') + '\n';

            const filename = 'data.csv';

            fs.appendFile(filename, csvData, (err) => {
                if (err) {
                    console.log("errore nella scrittura del file");
                    res.json({ response: 'error writing file' });
                    return;
                }

                // Risposta al client "available"
                res.json({ response: 'available' });
            });
        } else {
            // Risposta al client "not available"
            res.json({ response: 'not available' });
        }
    });
});

// Nuova rotta per gestire i dati del modulo di contatto
app.post('/sendContactData', (req, res) => {
    const contactData = req.body.data;

    // Configurazione del trasportatore di nodemailer
    const transporter = nodemailer.createTransport({
        service: 'hotmail', 
        auth: {
            user: adminMail, // email
            pass: adminMailPassword // password
        }
    });

    // Opzioni del messaggio email
    const mailOptions = {
        from: adminMail, // Inserisci la tua email
        to: adminMail,
        subject: 'Nuovo messaggio dal modulo di contatto',
        text: `Nome: ${contactData.name}\nEmail: ${contactData.email}\nMessaggio: ${contactData.message}`
    };

    // Invia l'email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.json({ response: 'error sending email' });
        } else {
            console.log('Email inviata: ' + info.response);
            res.json({ response: 'success' });
        }
    });
});

// Definizione della rotta per ricevere i dati
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Admin Email: ${adminMail}`);
  console.log(`Admin Email Password: ${adminMailPassword}`);
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

// funzione per fare un log settimanale
function weeklyLog(startDate, endDate) {
    const fileName = 'log_' + startDate + '_' + endDate + '.csv';
    
    // Leggi il file data.csv
    fs.readFile('data.csv', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        // Dividi il contenuto del file in righe
        const lines = data.trim().split('\n');
        const headers = lines[0]; // Salva l'intestazione
        const logEntries = [headers]; // Aggiungi l'intestazione alle voci di log
        const remainingEntries = [headers]; // Mantieni l'intestazione per i dati rimanenti

        // Cicla attraverso le righe del CSV partendo dalla seconda (indice 1)
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');

            // Controlla se la riga è compresa tra startDate e endDate (estremi compresi)
            const bookingDate = new Date(row[0]); // assumendo che row[0] sia la data di prenotazione

            if (bookingDate >= new Date(startDate) && bookingDate <= new Date(endDate)) {
                // Aggiungi questa riga alle voci di log da memorizzare
                logEntries.push(row.join(','));
            } else {
                // Mantieni questa riga nei dati rimanenti
                remainingEntries.push(row.join(','));
            }
        }

        // Scrivi le voci di log nel file di log
        fs.writeFile(fileName, logEntries.join('\n') + '\n', (err) => {
            if (err) {
                console.error('Errore nella scrittura del file di log:', err);
            } else {
                console.log('File di log settimanale creato con successo:', fileName);
            }
        });

        // Scrivi le righe rimanenti nel file data.csv
        fs.writeFile('data.csv', remainingEntries.join('\n') + '\n', (err) => {
            if (err) {
                console.error('Errore nel salvataggio dei dati rimanenti in data.csv:', err);
            } else {
                console.log('File data.csv aggiornato correttamente');
            }
        });
    });
}
