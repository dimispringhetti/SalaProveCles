const express = require('express');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();
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
    const bookings = [];
    fs.readFile('data.csv', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const lines = data.trim().split('\n');
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
        const available = isRoomAvailable(receivedData, bookings);
        if (available) {
            const csvData = Object.values(receivedData).join(',') + '\n';
            const filename = 'data.csv';
            fs.appendFile(filename, csvData, (err) => {
                if (err) throw err;
            });
            responseData = "available";
        } else {
            responseData = "not available";
        }
        res.json({ response: responseData });
    });
});

app.post('/sendContactData', (req, res) => {
    const contactData = req.body.data;
    fs.appendFile('contactMessages.txt', JSON.stringify(contactData) + '\n', (err) => {
        if (err) {
            console.error(err);
            res.json({ response: 'error' });
            return;
        }
        console.log(contactData);
        res.json({ response: 'success' });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

function isRoomAvailable(newBooking, bookings) {
    const { date, startTime, endTime } = newBooking;
    const newStartTime = new Date(`${date} ${startTime}`);
    const newEndTime = new Date(`${date} ${endTime}`);
    for (const booking of bookings) {
        const bookingStartTime = new Date(`${booking.DATA} ${booking.ORA_INIZIO}`);
        const bookingEndTime = new Date(`${booking.DATA} ${booking.ORA_FINE}`);
        if (newStartTime < bookingEndTime && newEndTime > bookingStartTime) {
            return false;
        }
    }
    return true;
}

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
                callback();
            }
        });
    });
}
function weeklyLog(startDate, endDate) {
    const fileName = `log_${startDate}_${endDate}.csv`;
    const historicalFileName = 'historical_data.csv';
    fs.readFile('data.csv', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const lines = data.trim().split('\n');
        const headers = lines[0];
        const logEntries = [headers];
        const remainingEntries = [headers];
        
        // Itera tutte le righe tranne l'intestazione
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            const bookingDate = new Date(row[0]);
            
            // Se la data della prenotazione è prima o uguale a endDate, la sposta in logEntries
            if (bookingDate <= new Date(endDate)) {
                logEntries.push(row.join(','));
            } else {
                // Altrimenti, la lascia in remainingEntries
                remainingEntries.push(row.join(','));
            }
        }
        
        // Scrive logEntries nel file settimanale
        fs.writeFile(fileName, logEntries.join('\n') + '\n', (err) => {
            if (err) {
                console.error('Errore nella scrittura del file di log settimanale:', err);
            } else {
                // Invia l'email con il file di log settimanale come allegato
                sendLogEmail(fileName);
                
                // Aggiunge logEntries (escludendo l'intestazione) al file storico
                fs.appendFile(historicalFileName, logEntries.slice(1).join('\n') + '\n', (err) => {
                    if (err) {
                        console.error('Errore nell\'aggiunta al file storico:', err);
                    } else {
                        // Dati aggiunti con successo al file storico
                    }
                });
            }
        });
        
        // Scrive remainingEntries nel file data.csv
        fs.writeFile('data.csv', remainingEntries.join('\n') + '\n', (err) => {
            if (err) {
                console.error('Errore nell\'aggiornamento dei dati rimanenti:', err);
            } else {
                // File data.csv aggiornato correttamente
            }
        });
    });
}

function sendLogEmail(fileName) {
    const adminMail = process.env.ADMIN_MAIL;
    const adminMailPassword = process.env.ADMIN_MAIL_PASSWORD;
    const transporter = nodemailer.createTransport({
        service: 'hotmail',
        auth: {
            user: adminMail,
            pass: adminMailPassword
        }
    });
    const mailOptions = {
        from: adminMail,
        to: adminMail,
        subject: 'Log settimanale delle prenotazioni',
        text: 'In allegato trovi il file di log settimanale delle prenotazioni.',
        attachments: [
            {
                filename: fileName,
                path: './' + fileName
            }
        ]
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Errore nell\'invio dell\'email:', error);
        } else {
            console.log('Email inviata con successo:', info.response);
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

cron.schedule('55 10 * * 3', () => {
    const now = new Date();
    
    // Calcolo del lunedì della settimana corrente
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    
    // Calcolo della domenica della settimana corrente
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + (now.getDay() === 0 ? 0 : 6 - now.getDay() + 1));

    sortBookingsByDate(() => {
        weeklyLog(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    });
});
