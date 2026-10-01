# Virtual Cards App

Application complète de cartes bancaires virtuelles avec :
- Authentification utilisateur
- Création de cartes virtuelles
- Recharge de compte
- Transactions et historique
- Virements bancaires
- KYC (Know Your Customer)
- 2FA avec authenticator
- Dashboard administrateur
- Détection de fraude
- Paiement Stripe

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Base de données: SQLite

## Démarrage rapide

### 1) Backend
```bash
cd backend
npm install
cp .env.example .env
npm start
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

## Accès
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Comptes de démonstration
- Admin: email admin@virtualcards.com / mot de passe AdminSecure123!

## Fichiers principaux
- backend/server.js : API principale
- backend/db.js : base SQLite et schéma
- frontend/src/App.jsx : routing et structure de l'application
- frontend/src/pages : écrans de l'application

## Notes
- Le projet est un prototype fonctionnel de démonstration.
- Le Stripe est implémenté avec une simulation de paiement et un flow de confirmation.
- Le 2FA est prêt pour une app d'authentification (Google Authenticator ou similar).
