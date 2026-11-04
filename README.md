# BioSynX — plateforme web full-stack

Prototype local avec interface React responsive, API Node.js et base SQLite persistante. Il couvre le suivi des lots, la télémétrie simulée, les essais de formulation et la validation des demandes par un manager.

> **Mode actuel : simulation uniquement.** Les relevés sont générés localement. Aucun ESP32, relais, moteur ou appareil 220 V n’est connecté ou commandé.

## Prérequis

- Node.js 22.5 ou plus récent (`node:sqlite` intégré)

## Démarrage local

Dans PowerShell :

```powershell
Copy-Item .env.example .env
notepad .env
```

Dans `.env`, définis une adresse e-mail et un mot de passe manager unique d’au moins 12 caractères. Remplace également le nom du manager si nécessaire. Le mot de passe d’exemple est volontairement refusé. Puis lance les tests et le serveur :

```powershell
npm.cmd test
npm.cmd start
```

Ouvre <http://127.0.0.1:3000> et connecte-toi avec `BIOSYNX_MANAGER_EMAIL` et `BIOSYNX_MANAGER_PASSWORD`. Le compte manager est créé (ou actualisé depuis `.env`) au démarrage. Pour changer le mot de passe manager, modifie `.env` puis redémarre le serveur.

Les fichiers React compilés sont inclus dans le projet, le démarrage ne nécessite donc pas de compilation. Pour modifier l’interface, installe les dépendances puis reconstruis les fichiers statiques :

```powershell
npm.cmd install
npm.cmd run build
```

## Rôles et circuit de validation

- Le manager crée les comptes membres depuis **Équipe**. Il n’y a pas d’inscription publique. Les mots de passe des comptes membres doivent faire au moins 12 caractères ; le manager peut suspendre un compte ou réinitialiser son mot de passe.
- Un membre peut proposer la création d’un lot, la modification du statut d’un lot ou un nouveau ratio de formulation. Ces actions restent en attente et ne modifient pas les données actives avant l’approbation du manager. L’archivage de lot est également traité comme une demande.
- Le manager peut modifier directement les lots et la formulation, et approuver ou refuser les demandes en attente. Chaque demande et décision est conservée dans SQLite.
- Les rôles sont vérifiés par l’API côté serveur, pas seulement par l’interface. Les mots de passe sont hachés avec scrypt ; les sessions utilisent un cookie HttpOnly, la protection CSRF et une limitation des tentatives de connexion.

## Fonctions

- Interface React responsive, navigation latérale, cartes de suivi et visualisation du séchage.
- Tableau de bord, mesures simulées, lots de production et formulation d’essai.
- Actualisation du tableau de bord toutes les 15 secondes.
- Comptes manager/membres, journal de demandes et espace de validation.
- SQLite avec persistance dans `data/biosynx.sqlite`.
- Le serveur écoute par défaut sur `127.0.0.1`.

## Tests

```powershell
npm.cmd test
```

Les tests d’intégration couvrent les connexions manager/membre, les droits d’approbation, les protections CSRF et le fait qu’une proposition n’est pas appliquée avant validation.

## Limites et déploiement

Cette version reste un prototype local. Avant un déploiement réel, prévoir HTTPS, sauvegardes testées, gestion sécurisée des secrets, journalisation/surveillance et revue de sécurité. N’expose pas directement le serveur sur Internet sans ces mesures. Pour permettre à l’équipe de s’y connecter depuis d’autres appareils, déploie-le derrière HTTPS avec des paramètres adaptés. La connexion aux vrais capteurs nécessitera de définir le protocole et l’authentification de la passerelle ESP32. Aucun contrôle de relais ou moteur n’est inclus ; les protections électriques doivent rester indépendantes du site web.
