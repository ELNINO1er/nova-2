# Déployer NOVA sur Hostinger

## Offre requise

Utiliser une offre Hostinger **Business Web Hosting**, **Cloud** ou un **VPS**. Le déploiement Node.js intégré de hPanel est recommandé pour éviter l'administration manuelle d'un VPS.

## Préparation MySQL

1. Créer une base MySQL et un utilisateur dédié dans hPanel.
2. Ne jamais utiliser le compte `root` en production.
3. Conserver le nom d'hôte, le port, le nom de la base, l'utilisateur et le mot de passe fournis par Hostinger.

## Déploiement hPanel

1. Compresser le contenu du projet sans `.env`, `node_modules`, `dist`, `data/uploads` ni fichiers de log, ou connecter un dépôt GitHub privé.
2. Dans hPanel, choisir **Ajouter un site → Déployer une application web → Node.js**.
3. Sélectionner Node.js 20 ou 22.
4. Commande de build : `npm run build`.
5. Fichier d'entrée : `server/index.js`.
6. Commande de démarrage, si demandée : `npm start`.
7. Ajouter les variables ci-dessous dans l'écran **Environment Variables**.

```text
NODE_ENV=production
SEED_DEMO=false
ENABLE_API_DOCS=false
WEB_ORIGIN=https://votre-domaine.tld
DB_HOST=hote-mysql-hostinger
DB_PORT=3306
DB_USER=utilisateur_nova
DB_PASSWORD=mot-de-passe-unique
DB_NAME=base_nova
JWT_SECRET=secret-aleatoire-de-64-caracteres-minimum
JWT_REFRESH_SECRET=autre-secret-aleatoire-de-64-caracteres-minimum
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=...
```

Ne pas définir `PORT` manuellement si Hostinger le fournit automatiquement. NOVA utilise `PORT`, puis `API_PORT` en secours.

## Premier administrateur

Créer temporairement les variables suivantes :

```text
BOOTSTRAP_ADMIN_PHONE=0700000000
BOOTSTRAP_ADMIN_NAME=Administrateur NOVA
```

Exécuter une seule fois `npm run bootstrap:admin` dans un environnement ayant accès à la base. Retirer ensuite les deux variables. L'administrateur se connecte uniquement par OTP.

## Vérifications après déploiement

- Ouvrir `https://votre-domaine.tld/api/health` et vérifier `database: ready`.
- Vérifier que `/api/docs` renvoie 404 en production.
- Tester l'envoi et la vérification OTP.
- Tester séparément les quatre rôles.
- Téléverser, télécharger puis supprimer un document de test.
- Vérifier le journal des accès patient.
- Activer les sauvegardes automatiques MySQL et tester une restauration.

## Mise à jour

Avec GitHub, pousser sur la branche connectée puis vérifier les journaux du nouveau déploiement. Avec un ZIP, téléverser une archive neuve sans les secrets et sans `node_modules`.

