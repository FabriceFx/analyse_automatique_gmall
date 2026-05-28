# Analyse Automatique GMail avec Gemini AI


[🇫🇷 Version Française](#-version-française) | [🇬🇧 English Version](#-english-version)

![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green)
![Runtime](https://img.shields.io/badge/Google%20Apps%20Script-V8-green)
![Author](https://img.shields.io/badge/Auteur-Fabrice%20Faucheux-orange)

## 🇫🇷 Version Française


**[Français]**
Un assistant intelligent pour Gmail qui utilise l'API Google Gemini pour trier vos emails, identifier ceux qui nécessitent une réponse et vous envoyer un résumé quotidien.

**[English]**
A smart assistant for Gmail using Google Gemini API to sort your emails, identify those requiring a reply, and send you a daily digest.

---

## 🚀 Fonctionnalités / Features

### 🇫🇷 Français
* **Analyse IA avancée** : Utilise le modèle `gemini-2.0-flash` pour lire et comprendre le contexte des emails.
* **Tri intelligent** : Distingue les emails nécessitant une action (questions, tâches, validations) des notifications ou newsletters.
* **Étiquetage automatique** : Applique les libellés "À Répondre" ou "Traité" pour garder votre boîte de réception organisée.
* **Résumé Quotidien** : Envoie un email récapitulatif HTML propre contenant la liste des conversations en attente d'action.
* **Gestion des quotas** : Traitement par lots (batch) pour optimiser les appels aux API Google.

### 🇬🇧 English
* **Advanced AI Analysis**: Uses the `gemini-2.0-flash` model to read and understand email context.
* **Smart Sorting**: Distinguishes actionable emails (questions, tasks, approvals) from notifications or newsletters.
* **Auto-Labeling**: Applies "À Répondre" (To Reply) or "Traité" (Processed) labels to keep your inbox organized.
* **Daily Digest**: Sends a clean HTML summary email containing a list of conversations awaiting action.
* **Quota Management**: Uses batch processing to optimize Google API calls.

---

## 🛠 Prérequis / Prerequisites

1.  Un compte Google (Google Workspace ou Gmail personnel).
2.  Une clé API Google AI Studio (Gemini API Key).
    * Obtenir une clé ici : [Google AI Studio](https://aistudio.google.com/)

---

## ⚙️ Installation & Configuration

### 1. Création du Script / Script Creation
1.  Allez sur [script.google.com](https://script.google.com/).
2.  Créez un nouveau projet.
3.  Copiez le contenu du fichier `Code.gs` dans l'éditeur.

### 2. Configuration de la Clé API / API Key Setup
Le script utilise `PropertiesService` pour sécuriser votre clé API.
1.  Dans l'éditeur Apps Script, cliquez sur l'icône **Paramètres du projet** (roue dentée à gauche).
2.  Faites défiler jusqu'à **Propriétés de script**.
3.  Cliquez sur **Ajouter une propriété de script**.
    * **Propriété / Property** : `CLE_API_GEMINI`
    * **Valeur / Value** : `Votre_Clé_API_Commencant_Par_AIza...`
4.  Cliquez sur **Enregistrer**.

### 3. Mise en place des Déclencheurs / Setting up Triggers
Pour automatiser le script, vous devez configurer des déclencheurs temporels (Triggers).

1.  Cliquez sur l'icône **Déclencheurs** (réveil à gauche).
2.  **Pour l'analyse des emails (`traiterNouveauxEmails`)** :
    * Ajouter un déclencheur.
    * Fonction : `traiterNouveauxEmails`.
    * Source : Basé sur le temps (Time-driven).
    * Type : Toutes les minutes ou toutes les 5 minutes (selon votre volume d'emails).
3.  **Pour le résumé quotidien (`envoyerResumeQuotidien`)** :
    * Ajouter un déclencheur.
    * Fonction : `envoyerResumeQuotidien`.
    * Source : Basé sur le temps (Time-driven).
    * Type : Compteur journalier (Day timer).
    * Heure : 8h00 à 9h00 (ou votre heure préférée).

---

## 📖 Utilisation / Usage

### Fonctionnement / How it works
* Le script recherche les emails **Non lus** qui n'ont pas encore le libellé "Traité".
* Il envoie le contenu (sujet + corps tronqué à 8000 caractères) à Gemini.
* Si Gemini détecte une demande de réponse (Question directe, demande de livrable, etc.), le libellé **"À Répondre"** est appliqué.
* Sinon, le libellé **"Traité"** est appliqué.
* Une fois par jour, vous recevez un tableau récapitulatif des emails "À Répondre".

### Personnalisation / Customization
Vous pouvez modifier la constante `CONFIG` au début du fichier `Code.gs` pour changer les noms des libellés ou le modèle IA :

```javascript
const CONFIG = {
  NOM_LIBELLE_TRAITE: 'Traité',
  NOM_LIBELLE_A_REPONDRE: 'À Répondre',
  MODELE_IA: 'gemini-2.0-flash', 
  MAX_THREADS: 100 
};


---
## 🇬🇧 English Version

> English translation coming soon.

---
<p align="center"><a href="https://faucheux.bzh" target="_blank" style="color: inherit; text-decoration: none;">&lt;&gt; par Fabrice Faucheux</a></p>