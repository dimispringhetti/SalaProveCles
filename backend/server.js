const express = require('express');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const adminMail = process.env.ADMIN_MAIL;
const adminMailPassword = process.env.ADMIN_MAIL_PASSWORD;

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post('/sendData', (req, res) => {
    const receivedData = req.body.data;
    let responseData = "not logged";
    const bookings = [];

    // Leggi il file logged_users.csv per verificare il login dell'utente
    const users = fs.readFileSync('logged_users.csv', 'utf8');
    const usersArray = users.split('\n');

    // Controlla se l'utente è loggato
    let isLoggedIn = false;
    for (let i = 0; i < usersArray.length; i++) {
        const user = usersArray[i].split(',');
        if (user[0] === receivedData.firstName && user[1] === receivedData.lastName && user[2] === receivedData.email) {
            isLoggedIn = true;
            break;
        }
    }

    // Se l'utente è loggato, procedi con la gestione delle prenotazioni
    if (isLoggedIn) {
        fs.readFile('data.csv', 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                res.json({ response: 'error' });
                return;
            }
            
            const lines = data.trim().split('\n');
            const headers = lines[0].split(',');
            
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(',');
                if (row.length === headers.length) {
                    bookings.push(receivedData);
                }
            }

            // Controlla la disponibilità della stanza
            const available = isRoomAvailable(receivedData, bookings);
            if (available) {
                // Aggiungi la prenotazione al file CSV
                const csvData = Object.values(receivedData).join(',') + '\n';
                const filename = 'data.csv';
                fs.appendFile(filename, csvData, (err) => {
                    if (err) throw err;
                    console.log('Prenotazione aggiunta con successo:', csvData);
                    responseData = "available";
                    res.json({ response: responseData });
                });
            } else {
                responseData = "not available";
                res.json({ response: responseData });
            }
        });
    } else {
        res.json({ response: responseData });
    }
});

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
        from: adminMail,
        to: adminMail,
        subject: 'Nuovo messaggio dal modulo di contatto',
        text: `Nome: ${contactData.name}\nEmail: ${contactData.email}\nMessaggio: ${contactData.message}`
    };

    // Invia l'email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Errore nell\'invio della mail:', error);
            res.status(500).json({ response: 'error', message: error.message });
        } else {
            console.log('Email inviata:', info.response);
            res.json({ response: 'success' });
        }
    });
});

// Definizione della rotta per ricevere i dati
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
        
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            const bookingDate = new Date(row[0]);
            
            if (bookingDate <= new Date(endDate)) {
                logEntries.push(row.join(','));
            } else {
                remainingEntries.push(row.join(','));
            }
        }
        
        fs.writeFile(fileName, logEntries.join('\n') + '\n', (err) => {
            if (err) {
                console.error('Errore nella scrittura del file di log settimanale:', err);
            } else {
                sendLogEmail(fileName);
                
                fs.appendFile(historicalFileName, logEntries.slice(1).join('\n') + '\n', (err) => {
                    if (err) {
                        console.error('Errore nell\'aggiunta al file storico:', err);
                    } else {
                        console.log('Dati aggiunti con successo al file storico');
                    }
                });
            }
        });
        
        fs.writeFile('data.csv', remainingEntries.join('\n') + '\n', (err) => {
            if (err) {
                console.error('Errore nell\'aggiornamento dei dati rimanenti:', err);
            } else {
                console.log('File data.csv aggiornato correttamente');
            }
        });
    });
}

function sendLogEmail(fileName) {

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

cron.schedule('00 00 * * 1', () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + (now.getDay() === 0 ? 0 : 6 - now.getDay() + 1));

    sortBookingsByDate(() => {
        weeklyLog(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    });
});
