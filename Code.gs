/**
 * @fileoverview Script d'analyse automatique des emails via Google Gemini AI.
 * Identifie les emails nécessitant une réponse et applique les libellés Gmail correspondants.
 *
 * @author Fabrice Faucheux
 */

// --- CONFIGURATION ---
const CONFIG = {
  NOM_LIBELLE_TRAITE: 'Traité',
  NOM_LIBELLE_A_REPONDRE: 'À Répondre',
  // Mise à jour vers la version 2.0 Flash (très rapide)
  MODELE_IA: 'gemini-2.0-flash', 
  MAX_THREADS: 100 
};

/**
 * Fonction principale : Récupère les emails non lus, les analyse via l'IA
 * et applique les libellés de manière groupée (batch operation).
 */
function traiterNouveauxEmails() {
  console.time('Temps d\'exécution');
  
  // 1. Récupération des libellés (ou création s'ils n'existent pas)
  const libelleTraite = obtenirOuCreerLibelle(CONFIG.NOM_LIBELLE_TRAITE);
  const libelleARepondre = obtenirOuCreerLibelle(CONFIG.NOM_LIBELLE_A_REPONDRE);

  // 2. Recherche des threads éligibles (Non lus, sans le libellé 'Traité')
  // Note : J'ai retiré 'label:Test' pour un usage réel sur la boîte de réception.
  // Ajoutez 'in:inbox' si vous voulez limiter à la boîte de réception.
  const requeteRecherche = `is:unread -label:${CONFIG.NOM_LIBELLE_TRAITE}`;
  const threads = GmailApp.search(requeteRecherche, 0, CONFIG.MAX_THREADS);

  if (threads.length === 0) {
    console.log('Aucun nouvel email à traiter.');
    return;
  }

  // Tableaux pour les opérations par lots (Batch operations)
  const threadsTraites = [];
  const threadsARepondre = [];

  // 3. Analyse itérative
  threads.forEach(thread => {
    try {
      const message = thread.getMessages()[0]; // On analyse le premier message du fil
      const resultatAnalyse = analyserContenuEmail(message);

      if (resultatAnalyse && resultatAnalyse.necessiteReponse) {
        threadsARepondre.push(thread);
        console.log(`[À RÉPONDRE] Sujet : "${message.getSubject()}"`);
      } else {
        console.log(`[INFO] Sujet : "${message.getSubject()}" - Pas d'action requise.`);
      }

      // On marque systématiquement le thread comme traité pour ne pas le re-scanner
      threadsTraites.push(thread);

    } catch (erreur) {
      console.error(`Erreur lors du traitement du thread ID ${thread.getId()} : ${erreur.message}`);
    }
  });

  // 4. Application des libellés par lots (Optimisation API)
  if (threadsARepondre.length > 0) {
    libelleARepondre.addToThreads(threadsARepondre);
    console.log(`${threadsARepondre.length} libellés '${CONFIG.NOM_LIBELLE_A_REPONDRE}' appliqués.`);
  }

  if (threadsTraites.length > 0) {
    libelleTraite.addToThreads(threadsTraites);
    console.log(`${threadsTraites.length} libellés '${CONFIG.NOM_LIBELLE_TRAITE}' appliqués.`);
  }

  console.timeEnd('Temps d\'exécution');
}

/**
 * Envoie le contenu de l'email à l'API Gemini pour déterminer si une réponse est requise.
 *
 * @param {GmailApp.GmailMessage} message - L'objet message Gmail.
 * @return {Object|null} Un objet JSON { "necessiteReponse": boolean } ou null en cas d'erreur.
 */
function analyserContenuEmail(message) {
  const cleApi = PropertiesService.getScriptProperties().getProperty('CLE_API_GEMINI');
  
  if (!cleApi) {
    throw new Error("La clé API Gemini n'est pas configurée dans les propriétés du script.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODELE_IA}:generateContent?key=${cleApi}`;

  // Construction du prompt optimisé pour le français
  const prompt = `
    Analyse l'email suivant et détermine s'il nécessite une réponse directe de ma part.
    Ta réponse doit être STRICTEMENT un objet JSON unique avec une seule clé :
    - "necessiteReponse": un booléen (true ou false).

    Règle "necessiteReponse" à TRUE uniquement si l'email répond à l'un de ces critères :
    1. C'est un message personnel direct qui me pose une question.
    2. C'est une demande directe de livrable ou de tâche dont je suis responsable.
    3. Il nécessite explicitement ma validation, mon approbation ou une décision.
    4. C'est une suite d'une conversation que j'ai initiée et qui attend mon retour.

    Règle "necessiteReponse" à FALSE dans tous les autres cas, notamment :
    1. Notifications automatiques, newsletters, reçus d'achat, logs système.
    2. Invitations d'agenda (Google Calendar) ou simples confirmations.
    3. Messages où je suis en copie (Cc) pour information seulement.
    4. Emails de remerciement simples ("Merci", "Bien reçu").
    5. Appels à l'action génériques (marketing).

    Sujet de l'email : "${message.getSubject()}"
    Corps de l'email :
    ---
    ${message.getPlainBody().substring(0, 8000)} 
    ---
    (Note: Le corps est tronqué à 8000 caractères pour respecter les limites de token si nécessaire).
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const reponseHttp = UrlFetchApp.fetch(url, options);
    const codeReponse = reponseHttp.getResponseCode();

    if (codeReponse !== 200) {
      console.error(`Erreur API Gemini (${codeReponse}) : ${reponseHttp.getContentText()}`);
      return null;
    }

    const donnees = JSON.parse(reponseHttp.getContentText());
    
    // Extraction et nettoyage du JSON (retrait des balises markdown ```json ... ```)
    let texteReponse = donnees.candidates[0].content.parts[0].text;
    texteReponse = texteReponse.replace(/```json|```/g, '').trim();

    return JSON.parse(texteReponse);

  } catch (e) {
    console.error(`Erreur lors de l'appel ou du parsing Gemini : ${e.toString()}`);
    return null;
  }
}

/**
 * Utilitaire pour récupérer un libellé par son nom ou le créer s'il n'existe pas.
 *
 * @param {string} nom - Le nom du libellé.
 * @return {GmailApp.GmailLabel} L'objet libellé.
 */
function obtenirOuCreerLibelle(nom) {
  let libelle = GmailApp.getUserLabelByName(nom);
  if (!libelle) {
    console.log(`Création du libellé : ${nom}`);
    libelle = GmailApp.createLabel(nom);
  }
  return libelle;
}


/**
 * Génère et envoie un résumé par email des messages en attente de réponse.
 * À programmer via un déclencheur temporel quotidien (ex: 8h00 matin).
 */
function envoyerResumeQuotidien() {
  console.time('Génération Résumé');

  try {
    // 1. Récupération des threads marqués "À Répondre"
    // On utilise la recherche pour exclure les messages qui auraient pu être traités (archivés ou sans le label)
    // "label:À Répondre -is:trash"
    const requete = `label:${CONFIG.NOM_LIBELLE_A_REPONDRE} -is:trash`;
    const threadsEnAttente = GmailApp.search(requete);

    if (threadsEnAttente.length === 0) {
      console.log("Aucun email en attente pour le résumé. Envoi annulé.");
      return;
    }

    // 2. Construction des données pour le template HTML
    const donneesEmails = threadsEnAttente.map(thread => {
      const message = thread.getMessages()[0]; // Le premier message ou le plus récent
      return {
        sujet: thread.getFirstMessageSubject(),
        expediteur: message.getFrom(),
        date: message.getDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
        lien: thread.getPermalink() // Lien direct vers le thread dans Gmail
      };
    });

    // 3. Construction du corps HTML de l'email
    // Utilisation de styles inline pour garantir l'affichage correct dans Gmail
    const corpsHtml = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2c3e50;">📅 Votre résumé quotidien</h2>
        <p>Bonjour,</p>
        <p>Vous avez actuellement <strong>${donneesEmails.length} conversation(s)</strong> marquée(s) comme nécessitant une réponse :</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2; text-align: left;">
              <th style="padding: 10px; border-bottom: 1px solid #ddd;">Sujet</th>
              <th style="padding: 10px; border-bottom: 1px solid #ddd;">Expéditeur</th>
              <th style="padding: 10px; border-bottom: 1px solid #ddd;">Date</th>
              <th style="padding: 10px; border-bottom: 1px solid #ddd;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${donneesEmails.map(email => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${email.sujet}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.expediteur.replace(/<.*>/, '').trim()}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.date}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                  <a href="${email.lien}" style="background-color: #1a73e8; color: white; padding: 5px 10px; text-decoration: none; border-radius: 4px; font-size: 12px;">Ouvrir</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">
          <em>Ce résumé a été généré automatiquement par votre assistant Gemini Apps Script.</em>
        </p>
      </div>
    `;

    // 4. Envoi de l'email à l'utilisateur courant
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: `[Assistant] ${donneesEmails.length} emails en attente de réponse`,
      htmlBody: corpsHtml
    });

    console.log(`Résumé envoyé avec succès (${donneesEmails.length} items).`);

  } catch (erreur) {
    console.error(`Échec de l'envoi du résumé : ${erreur.toString()}`);
  }
  
  console.timeEnd('Génération Résumé');
}

/**
 * Interroge l'API Google pour lister les modèles disponibles pour votre clé.
 * Utile pour déboguer les erreurs 404 sur les noms de modèles.
 */
function listerModelesDisponibles() {
  const cleApi = PropertiesService.getScriptProperties().getProperty('CLE_API_GEMINI');
  
  if (!cleApi) {
    console.error("Erreur : La clé API n'est pas configurée dans les propriétés du script.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleApi}`;

  const options = {
    'method': 'get',
    'muteHttpExceptions': true
  };

  try {
    const reponse = UrlFetchApp.fetch(url, options);
    const code = reponse.getResponseCode();
    
    if (code !== 200) {
      console.error(`Erreur lors de la récupération des modèles (${code}) : ${reponse.getContentText()}`);
      return;
    }

    const donnees = JSON.parse(reponse.getContentText());
    
    console.log("--- LISTE DES MODÈLES COMPATIBLES ---");
    
    // On filtre pour ne garder que les modèles capables de générer du contenu ("generateContent")
    const modelesGeneratifs = donnees.models.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
    );

    if (modelesGeneratifs.length === 0) {
      console.log("Aucun modèle de génération de contenu trouvé.");
    }

    modelesGeneratifs.forEach(modele => {
      // Le nom retourné est sous la forme "models/gemini-pro"
      // Pour la config, on retire souvent le préfixe "models/"
      const nomPropre = modele.name.replace('models/', '');
      console.log(`Nom à utiliser dans CONFIG : ${nomPropre}`);
      console.log(`Description : ${modele.displayName}`);
      console.log(`Version : ${modele.version}`);
      console.log("-------------------------------------");
    });

  } catch (e) {
    console.error("Exception lors de la récupération des modèles : " + e.toString());
  }
}
