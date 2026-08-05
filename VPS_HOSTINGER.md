# Déployer NOVA sur le VPS Hostinger

Architecture : Caddy SCMC existant (HTTPS) → API NOVA + frontend React → MySQL NOVA privé.

NOVA réutilise le réseau `scmc-backend_default`. Elle ne démarre pas un second Caddy et ne publie aucun port supplémentaire.

## 1. DNS et pare-feu

Créer un enregistrement DNS `A` :

```text
nova.mhtechconsulting.com → 2.24.140.18
```

Dans **VPS → Sécurité → Pare-feu**, autoriser uniquement :

- TCP 22 depuis votre adresse IP d'administration ;
- TCP 80 depuis toutes les adresses ;
- TCP 443 et UDP 443 depuis toutes les adresses.

Ne jamais ouvrir les ports 3306 ou 4001 sur Internet.

## 2. Préparer Ubuntu

Se connecter avec une clé SSH :

```bash
ssh root@2.24.140.18
apt update && apt upgrade -y
apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
docker compose version
```

## 3. Installer NOVA

```bash
git clone https://github.com/ELNINO1er/nova-2.git /opt/nova
cd /opt/nova
cp .env.vps.example .env
chmod 600 .env
```

Générer cinq secrets différents :

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Éditer `.env` et remplacer toutes les valeurs `CHANGE_ME`. Configurer également le fournisseur SMS avant de permettre les connexions OTP.

## 4. Démarrer

```bash
cd /opt/nova
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 nova-api
docker compose logs --tail=100 nova-db
```

Ajouter le bloc de `deploy/Caddyfile` au Caddy SCMC existant, puis valider et recharger sa configuration. Caddy obtient et renouvelle automatiquement le certificat TLS.

## 5. Vérifier

```bash
curl -fsS https://nova.mhtechconsulting.com/api/health
```

Résultat attendu :

```json
{"ok":true,"service":"nova-api","database":"ready"}
```

## 6. Créer le premier administrateur

Ajouter temporairement dans `.env` :

```text
BOOTSTRAP_ADMIN_PHONE=0700000000
BOOTSTRAP_ADMIN_NAME=Administrateur NOVA
```

Puis :

```bash
docker compose run --rm nova-api npm run bootstrap:admin
```

Retirer immédiatement ces deux lignes de `.env`.

## 7. Sauvegardes quotidiennes

```bash
chmod +x /opt/nova/deploy/backup.sh /opt/nova/deploy/deploy.sh
mkdir -p /opt/backups/nova
/opt/nova/deploy/backup.sh
crontab -e
```

Ajouter :

```cron
15 2 * * * /opt/nova/deploy/backup.sh >> /var/log/nova-backup.log 2>&1
```

Copier périodiquement `/opt/backups/nova` vers un stockage externe. Une sauvegarde présente uniquement sur le VPS ne protège pas contre la perte du serveur.

## 8. Mettre à jour

```bash
/opt/nova/deploy/deploy.sh
```

## Commandes utiles

```bash
docker compose ps
docker compose logs -f --tail=200 nova-api
docker compose logs -f --tail=200 nova-db
docker compose restart nova-api
docker compose down
docker stats
```

Ne jamais exécuter `docker compose down -v` : l'option `-v` supprimerait les volumes MySQL et les documents.
