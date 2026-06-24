# Documentation fonctionnelle — ProjeQtOr MCP Server

Cette documentation décrit **ce que le serveur permet de faire** d'un point de vue
métier : à qui il s'adresse, quels usages il couvre, quelles capacités il expose
et comment elles s'enchaînent. Elle complète le [README](README.md) qui, lui,
couvre l'installation, la configuration et le déploiement technique.

---

## 1. À quoi sert ce produit

Le serveur fait le pont entre un **assistant IA** (Claude, Codex, Copilot,
agents LangChain/deepagents…) et une instance **ProjeQtOr 12.x**, l'outil de
gestion de projet open source.

Concrètement, il permet à un assistant de **consulter et piloter un portefeuille
projet en langage naturel** : « Donne-moi l'avancement du projet 42 », « Crée un
ticket bug sur le module paiement », « Qui est en surcharge la semaine
prochaine ? ». L'assistant traduit la demande en appels d'outils MCP, le serveur
interroge ou met à jour ProjeQtOr via son API REST, et renvoie une réponse
exploitable.

Il s'appuie sur le **Model Context Protocol (MCP)**, un standard qui décrit trois
types de capacités : les **Tools** (actions), les **Resources** (sources de
données en lecture) et les **Prompts** (modèles d'analyse pré-rédigés).

### Le serveur ne fait pas

- Il ne remplace pas l'interface web ProjeQtOr ; il en automatise l'accès.
- Il ne stocke aucune donnée projet : il relaie chaque requête en temps réel.
- Il ne gère pas l'upload de fichiers binaires (seulement les fiches/métadonnées
  de documents).

---

## 2. Utilisateurs cibles et cas d'usage

| Profil | Ce qu'il obtient |
| --- | --- |
| **Chef de projet / PMO** | Rapports d'avancement, suivi planning, budget, risques, sans naviguer dans l'UI. |
| **Manager de ressources** | Vue charge/capacité, détection des surcharges, aide à la réaffectation. |
| **Équipe agile** | Synthèse de sprint, suivi des tickets, changements récents pour le standup. |
| **Direction / sponsor** | Vue portefeuille consolidée tous projets. |
| **Développeur d'agents** | API MCP standard branchable sur n'importe quel client compatible. |

Exemples de demandes que l'assistant sait satisfaire :

- « Rédige le rapport d'avancement du projet 42 pour le mois en cours. »
- « Liste les tickets ouverts de priorité haute non assignés. »
- « Crée une activité "Recette" du 1er au 15 juillet, 10 jours de charge. »
- « Analyse et priorise les risques du projet 7 avec une tolérance faible. »
- « Qu'est-ce qui a changé dans le projet 12 ces 7 derniers jours ? »
- « Saisis 2 jours de travail de la ressource 5 sur l'activité 88 le 24 juin. »

---

## 3. Domaines fonctionnels couverts

Le serveur organise ses capacités par domaine métier de gestion de projet.
Chaque outil porte un nom explicite (verbe + objet) et une description en
français côté MCP.

### 3.1 Projets

Gérer le cycle de vie des projets et leurs indicateurs.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Lister les projets (filtres statut / type) | `list_projects` | Lecture |
| Consulter le détail complet d'un projet | `get_project` | Lecture |
| Créer un projet | `create_project` | Écriture |
| Modifier un projet | `update_project` | Écriture |
| Données sources des KPI (projet + activités + travail + dépenses + budgets) | `get_project_kpis` | Lecture |

### 3.2 Activités et planning

Construire et suivre le planning : tâches, jalons, dépendances, données Gantt.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Lister les activités d'un projet (filtres statut / ressource) | `list_activities` | Lecture |
| Créer une activité/tâche | `create_activity` | Écriture |
| Modifier une activité (dates, charge, statut, responsable) | `update_activity` | Écriture |
| Récupérer les données Gantt (activités + jalons + dépendances) | `get_gantt_data` | Lecture |
| Ajouter une dépendance entre deux activités (type FS par défaut) | `add_dependency` | Écriture |
| Snapshot planning complet (activités + jalons + affectations + dépendances) | `get_project_planning_snapshot` | Lecture |

### 3.3 Tickets (bugs / support)

Suivre les demandes, incidents et tâches de support.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Lister les tickets (filtres projet / statut / priorité / responsable) | `list_tickets` | Lecture |
| Créer un ticket | `create_ticket` | Écriture |
| Mettre à jour un ticket (statut, priorité, affectation) | `update_ticket` | Écriture |
| Recherche avancée par critères (champ / opérateur / valeur) | `search_tickets` | Lecture |

### 3.4 Ressources et temps

Gérer les affectations, la charge et les feuilles de temps.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Lister les ressources (actives uniquement par défaut) | `list_resources` | Lecture |
| Affecter une ressource à une activité | `assign_resource` | Écriture |
| Charge d'une ressource sur une période (affectations + work logs) | `get_resource_workload` | Lecture |
| Saisir du temps sur une activité | `log_work` | Écriture |
| Consulter la feuille de temps sur une période | `get_timesheet` | Lecture |

### 3.5 Risques et suivi

Piloter les risques et les problèmes (issues).

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Lister les risques d'un projet (filtre statut) | `list_risks` | Lecture |
| Créer un risque (impact / probabilité / criticité / plan de mitigation) | `create_risk` | Écriture |
| Lister les problèmes/issues d'un projet | `list_issues` | Lecture |

### 3.6 Finance

Suivre le volet financier d'un projet.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Consulter les données financières (budgets, dépenses, devis, commandes, factures, paiements) | `get_project_budget` | Lecture |
| Enregistrer une dépense | `create_expense` | Écriture |

### 3.7 Documents, réunions, gouvernance

Tracer la documentation, les réunions et les décisions.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Lister les documents d'un projet/produit (métadonnées) | `list_documents` | Lecture |
| Créer une fiche document (métadonnées) | `create_document_record` | Écriture |
| Lister les réunions (filtre projet / depuis une date) | `list_meetings` | Lecture |
| Créer une réunion (date + ordre du jour) | `create_meeting` | Écriture |
| Lister les décisions et questions (gouvernance) | `list_decisions` | Lecture |

### 3.8 Recherche transverse

Chercher à travers tout le référentiel.

| Capacité | Outil MCP | Lecture / Écriture |
| --- | --- | --- |
| Recherche globale multi-entités (`name LIKE`) sur les classes principales | `global_search` | Lecture |
| Objets modifiés récemment (par défaut 7 jours) — utile pour standup / synthèse | `get_recent_changes` | Lecture |

---

## 4. Sources de données prêtes à l'emploi (Resources MCP)

Les **Resources** sont des vues consolidées en lecture seule, identifiées par une
URI. L'assistant peut les charger directement comme contexte, sans enchaîner
plusieurs appels d'outils.

| URI | Contenu fonctionnel |
| --- | --- |
| `projeqtor://projects/{id}/summary` | Résumé d'un projet : fiche projet, activités, tickets, risques, issues, travail consommé. |
| `projeqtor://dashboard/overview` | Vue portefeuille : tous les projets, tickets ouverts, risques actifs, activités modifiées sur 7 jours. |
| `projeqtor://reference/statuses` | Liste des statuts ProjeQtOr (référentiel). |
| `projeqtor://reference/types` | Types de projet / activité / ticket et priorités (référentiel). |
| `projeqtor://resources/{id}/availability` | Disponibilité d'une ressource : affectations, temps saisi, congés. |

---

## 5. Analyses pré-rédigées (Prompts MCP)

Les **Prompts** sont des modèles d'analyse paramétrés. Ils orchestrent
automatiquement les bons outils et resources, et cadrent le rendu attendu. C'est
le moyen le plus rapide d'obtenir un livrable structuré.

| Prompt | Paramètres | Livrable produit |
| --- | --- | --- |
| `project_status_report` | `project_id`, `period` | Rapport d'avancement : périmètre, planning, coût, charge consommée vs planifiée, retards, tickets, risques/issues, décisions attendues, prochaines actions. |
| `risk_analysis` | `project_id`, `risk_tolerance` | Classement des risques par probabilité/impact/criticité/ancienneté, plans de mitigation, responsables, escalades, données manquantes. |
| `resource_optimization` | `from_date`, `to_date`, `resource_id?`, `project_id?` | Détection des surcharges/sous-charges, goulets, options de réaffectation et impacts planning. |
| `sprint_review_summary` | `project_id`, `from_date`, `to_date`, `sprint_name?` | Synthèse de sprint : livrés, non terminés, défauts, vélocité/charge, risques, décisions, actions d'amélioration. |

---

## 6. Parcours fonctionnels types

Enchaînements concrets d'outils pour répondre à un besoin métier.

### Parcours A — Rapport d'avancement projet

1. L'utilisateur demande le rapport du projet 42.
2. L'assistant déclenche le prompt `project_status_report`.
3. Celui-ci charge la resource `projeqtor://projects/42/summary` et appelle
   `get_project_kpis`.
4. L'assistant rédige le rapport structuré.

### Parcours B — Création et affectation d'une tâche

1. `create_activity` crée la tâche dans le projet (nom, dates, charge planifiée).
2. `assign_resource` rattache une ressource à l'activité créée (charge affectée,
   taux).
3. `add_dependency` (optionnel) la relie à une tâche précédente.
4. `get_project_planning_snapshot` vérifie le planning consolidé.

### Parcours C — Suivi de charge des ressources

1. `list_resources` recense les ressources actives.
2. `get_resource_workload` mesure la charge de chacune sur la période.
3. Le prompt `resource_optimization` propose les rééquilibrages.

### Parcours D — Standup / synthèse de changements

1. `get_recent_changes` (7 derniers jours) liste les objets modifiés.
2. La resource `projeqtor://dashboard/overview` donne l'état global.
3. L'assistant synthétise les points saillants.

---

## 7. Règles métier importantes

Points fonctionnels structurants à connaître pour interpréter correctement les
données.

- **Unité de charge = le JOUR (j).** Tous les champs de charge/travail
  (`assignedWork`, `plannedWork`, `realWork`, `leftWork`, `work`) sont exprimés
  en **jours**, jamais en heures. Les valeurs sont arrondies à 2 décimales.
- **Lecture vs détail.** Les listes et recherches renvoient une **projection
  allégée** (seuls les champs utiles à l'analyse) pour économiser le contexte de
  l'assistant ; les outils de détail (`get_*`) renvoient l'objet complet.
- **Filtrage côté serveur.** Quand des filtres sont fournis (statut, type,
  priorité, ressource…), la recherche est faite côté ProjeQtOr plutôt qu'après
  coup, pour limiter le volume transféré.
- **Ressources actives.** `list_resources` masque par défaut les ressources
  inactives (`idle=1`) ; passer `active_only=false` pour tout voir.
- **Champs spécifiques à l'instance.** Les paramètres `extra` (création) et
  `updates` (modification) permettent de transmettre des champs natifs propres à
  votre instance ProjeQtOr, au-delà des champs standard exposés.
- **Champs natifs.** Les noms de champs suivent la convention ProjeQtOr
  (`idProject`, `idStatus`, `plannedStartDate`…).

---

## 8. Sécurité fonctionnelle

- **Aucun credential exposé.** Les identifiants ne sont jamais renvoyés via MCP.
- **Écritures chiffrées.** Les opérations de création/modification/suppression
  (`PUT`/`POST`/`DELETE`) sont chiffrées en **AES-CTR** avant envoi à ProjeQtOr.
  La clé AES est dérivée de `PROJEQTOR_API_KEY` ; sans cette clé, seules les
  lectures sont possibles.
- **Logs masqués.** Mots de passe, clés API, tokens et en-têtes d'autorisation
  sont masqués dans les logs ; aucune trace n'est écrite sur stdout en mode
  stdio.
- **Erreurs propres.** Les erreurs remontées à l'assistant sont lisibles, sans
  stack trace ni secret.
- **Transport HTTP non authentifié par défaut.** En usage distant, placer le
  serveur derrière un gateway exigeant un jeton (`GATE_TOKEN`) — voir README,
  section déploiement.

---

## 9. Pour aller plus loin

- Installation, configuration, transports et déploiement : [README](README.md).
- Branchement par client (Claude Code, Codex, deepagents, Claude Desktop) :
  README, section « Méthodes d'utilisation par client ».
- Détail du chiffrement et compatibilité des endpoints ProjeQtOr : README,
  sections « Chiffrement AES-CTR » et « Notes de compatibilité ».
