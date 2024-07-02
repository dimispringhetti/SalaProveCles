// Carica le variabili d'ambiente dal file .env
require('dotenv').config();

// Importa i moduli necessari
const fs = require('fs');
const nodemailer = require('nodemailer');

// Funzione per ordinare le prenotazioni in data.csv per data e ora
function sortBookingsByDate(callback) {
    fs.readFile('data.csv', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        const lines = data.trim().split('\n');
        const headers = lines[0];
        const rows = lines.slice(1);

        rows.sort((a, b) => {
            const [dateA, timeStartA] = a.split(',');
            const [dateB, timeStartB] = b.split(',');
            const dateTimeA = new Date(`${dateA}T${timeStartA}`);
            const dateTimeB = new Date(`${dateB}T${timeStartB}`);
            return dateTimeA - dateTimeB;
        });

        const sortedData = [headers, ...rows].join('\n');

        fs.writeFile('data.csv', sortedData + '\n', (err) => {
            if (err) {
                console.error('Errore nel salvataggio del file ordinato:', err);
            } else {
                console.log('File data.csv ordinato correttamente');
                callback(); // Chiama il callback dopo aver ordinato
            }
        });
    });
}

// Funzione weeklyLog
function weeklyLog(startDate, endDate) {
    const fileName = 'log_' + startDate + '_' + endDate + '.csv';
    const historicalFileName = 'historical_data.csv';

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
                sendLogEmail(fileName); // Invia il file di log tramite email
                
                // Aggiungi le voci di log al file storico
                fs.appendFile(historicalFileName, logEntries.slice(1).join('\n') + '\n', (err) => { // slice(1) per escludere l'intestazione
                    if (err) {
                        console.error('Errore nella scrittura del file storico:', err);
                    } else {
                        console.log('Dati aggiunti con successo al file storico:', historicalFileName);
                    }
                });
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

// Funzione per inviare il file di log tramite email
function sendLogEmail(fileName) {
    const adminMail = process.env.ADMIN_MAIL;
    const adminMailPassword = process.env.ADMIN_MAIL_PASSWORD;

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
        from: adminMail,
        to: adminMail,
        subject: 'Log settimanale delle prenotazioni',
        text: 'In allegato trovi il file di log settimanale delle prenotazioni.',
        attachments: [
            {
                filename: fileName,
                path: './' + fileName // il percorso del file di log
            }
        ]
    };

    // Invia l'email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Errore nell\'invio dell\'email:', error);
        } else {
            console.log('Email inviata con successo:', info.response);

            // Elimina il file di log settimanale dopo l'invio
            fs.unlink(fileName, (err) => {
                if (err) {
                    console.error('Errore nell\'eliminazione del file di log settimanale:', err);
                } else {
                    console.log('File di log settimanale eliminato con successo:', fileName);
                }
            });
        }
    });
}

// Esegui il test ordinando prima le prenotazioni
sortBookingsByDate(() => {
    weeklyLog(testStartDate, testEndDate);
});
