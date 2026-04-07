# Guide d'intégration Google Calendar

Ce guide explique comment configurer l'intégration entre **Pipeline** et **Google Calendar** pour synchroniser automatiquement les deadlines des projets.

## 1. Configuration sur Google Cloud Console

1. Allez sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Créez un nouveau projet nommé "Pipeline Agency".
3. Dans "APIs & Services", activez **Google Calendar API**.
4. Allez dans "OAuth consent screen" :
   - Choisissez "External".
   - Remplissez les informations de base.
   - Ajoutez l'étendue (scope) : `https://www.googleapis.com/auth/calendar.events`.
5. Allez dans "Credentials" :
   - Créez des "OAuth 2.0 Client IDs" de type "Web application".
   - Ajoutez les URIs de redirection autorisés :
     - `http://localhost:3000/api/auth/callback/google` (pour le dev)
     - `https://votre-domaine.com/api/auth/callback/google` (pour la prod)

## 2. Variables d'environnement

Ajoutez ces clés à votre fichier `.env` :

```env
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
```

## 3. Architecture technique suggérée

Pour implémenter la synchronisation, voici les étapes recommandées :

1. **Authentification** : Utiliser `next-auth` ou un flux OAuth2 manuel pour obtenir un `refresh_token` de l'utilisateur.
2. **Stockage** : Enregistrer le `refresh_token` dans la table `users` de Supabase de manière sécurisée.
3. **Synchronisation** : 
   - Créer une **Edge Function** Supabase ou une **Route API** Next.js.
   - À chaque modification de `deadline` dans la table `projects`, appeler l'API Google Calendar pour :
     - Créer un évènement (si inexistant).
     - Mettre à jour l'évènement (si la date change).
     - Supprimer l'évènement (si le projet est supprimé ou la deadline effacée).

## 4. Pourquoi c'est gratuit ?

L'API Google Calendar a un quota de **1 000 000 de requêtes par jour**, ce qui est largement suffisant pour les besoins d'une agence, même avec des centaines de projets par jour.
