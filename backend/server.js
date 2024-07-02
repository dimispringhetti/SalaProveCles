// Importa i moduli necessari
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Creazione di un'istanza di Express
const app = express();

// Imposta la porta del server
const port = 3000;

// Middleware per gestire i dati JSON
app.use(cors());
app.use(express.json());

app.post('/sendData', (req, res) => {
    const receivedData = req.body.data;

    // Scrittura dei dati ricevuti in un file di testo
    fs.writeFile('data.txt', JSON.stringify(receivedData), (err) => {
        if (err) {
            console.error(err);
            return;
        }
    });
    // stampa a console
    console.log(receivedData);

    // Risposta al client sempre "not available"
    const responseData = "not available";
    
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

    // Risposta al client "success"
    const responseData = "success";
    res.json({ response: responseData });
});

// Definizione della rotta per ricevere i dati
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
