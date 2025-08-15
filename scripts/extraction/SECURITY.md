# 🔐 Configuration Sécurisée - ETL ShowsTrack

## ⚠️ Sécurité des Credentials

**IMPORTANT** : Ne jamais stocker les credentials en dur dans le code !

## 🛠️ Configuration Recommandée

### 1. Fichier .env (Recommandé)

```bash
# Copier le template
copy .env.example .env

# Éditer avec vos vraies credentials
SHOWSTRACK_API_URL=http://localhost:8000
SHOWSTRACK_USERNAME=votre_username
SHOWSTRACK_PASSWORD=votre_password_securise
```

### 2. Variables d'environnement système

```bash
# Windows
set SHOWSTRACK_USERNAME=admin
set SHOWSTRACK_PASSWORD=mot_de_passe_securise

# Linux/Mac
export SHOWSTRACK_USERNAME=admin
export SHOWSTRACK_PASSWORD=mot_de_passe_securise
```

### 3. Passage par paramètres (Non recommandé)

```bash
python main.py --start-date 2025-08-14 --end-date 2025-08-14 --username admin --password secret
```

## 🔒 Bonnes Pratiques

1. **Fichier .env** : Toujours dans .gitignore
2. **Mots de passe forts** : Minimum 12 caractères
3. **Rotation régulière** : Changer les passwords périodiquement
4. **Accès limité** : Permissions minimales nécessaires
5. **Logs sécurisés** : Ne jamais logger les passwords

## 🚨 En cas de compromission

1. Changer immédiatement les credentials
2. Vérifier les logs d'accès
3. Révoquer les tokens JWT actifs
4. Auditer les changements récents

## ✅ Validation

Le système valide automatiquement :
- Présence des credentials requis
- Format des URLs
- Connexion à l'API avant utilisation