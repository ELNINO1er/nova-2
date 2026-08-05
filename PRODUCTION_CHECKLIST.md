# Checklist de mise en production NOVA

- [ ] `.env` absent du dépôt et de l'archive
- [ ] anciens secrets JWT et mots de passe révoqués
- [ ] `NODE_ENV=production`
- [ ] `SEED_DEMO=false`
- [ ] compte MySQL non-root avec privilèges limités
- [ ] domaine HTTPS configuré dans `WEB_ORIGIN`
- [ ] fournisseur SMS testé avec un vrai téléphone
- [ ] compte administrateur créé puis variables bootstrap retirées
- [ ] sauvegardes quotidiennes et restauration testée
- [ ] politique de confidentialité et consentements validés juridiquement
- [ ] test d'intrusion et revue de sécurité réalisés
- [ ] procédure d'incident et de révocation des accès documentée
- [ ] surveillance des erreurs, du CPU, de la mémoire et de l'espace disque activée
- [ ] documents médicaux stockés sur un volume persistant et sauvegardé

