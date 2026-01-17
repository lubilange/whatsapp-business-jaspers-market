"use strict";

const express = require('express');
const { urlencoded, json } = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware pour parser les messages WhatsApp
app.use(urlencoded({ extended: true }));
app.use(json());

// --- Stockage simple en mémoire pour suivre la conversation des patients ---
const patientSessions = {}; // { phoneNumber: [messages] }

// --- Webhook verification pour Meta ---
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// --- Réception des messages WhatsApp ---
app.post("/webhook", (req, res) => {
  if (req.body.object === "whatsapp_business_account") {
    req.body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        const value = change.value;
        if (value.messages) {
          value.messages.forEach(msg => {
            const from = msg.from;
            const text = msg.text?.body || "";

            // Initialiser la session si nouveau patient
            if (!patientSessions[from]) patientSessions[from] = [];
            patientSessions[from].push(text);

            // --- Logique santé simple ---
            let reply = `Merci pour votre message: "${text}".\n`;

            // Exemple de red-flag : fièvre ou douleur
            if (/fièvre|douleur|mal/i.test(text)) {
              reply += "⚠️ Attention : vos symptômes pourraient nécessiter un suivi médical.";
            } else {
              reply += `Vous avez envoyé ${patientSessions[from].length} message(s).`;
            }

            console.log(`Réponse à ${from}: ${reply}`);

            // Ici, tu enverrais la réponse via l'API WhatsApp
            // ex: sendMessage(from, reply);
          });
        }
      });
    });
  }

  res.status(200).send("EVENT_RECEIVED");
});

// --- Health check simple ---
app.get("/", (req, res) => {
  res.json({
    message: "FederatedSmartHealth WhatsApp Server is running",
    endpoints: ["POST /webhook"]
  });
});

// --- Lancement du serveur ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
