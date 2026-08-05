# Durcissement et préparation Hostinger

- Validation stricte des secrets et paramètres de production.
- Données et comptes de démonstration interdits en production.
- Suppression de l'ancienne authentification par code permanent.
- Jetons conservés uniquement dans des cookies `httpOnly`.
- Rotation et révocation durable des refresh tokens.
- Contrôle CORS multi-origines et prise en charge du proxy Hostinger.
- Endpoint de santé vérifiant réellement MySQL.
- Documentation Swagger désactivée par défaut en production.
- Frontend Vite servi directement par Express avec repli SPA.
- URL API relative, compatible avec un domaine Hostinger unique.
- Documents médecin séparés des documents patients.
- Réglages génériques séparés des réglages patients.
- Limites renforcées sur les formulaires et fichiers téléversés.
- Conteneur Docker exécuté avec un utilisateur non privilégié.
- Création sécurisée du premier administrateur par commande dédiée.
- Chargement à la demande de chaque page patient.
- Guides de déploiement et checklist de production.

