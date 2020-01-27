# YNAB API Webhooks

Webhooks for the YNAB API. This application sends changes on a YNAB budget to a URL.

Each time this application runs, it will issue a [Delta Request](https://api.youneedabudget.com/#deltas) to the YNAB API and if changes are detected, it will POST those changes to the URL specified with the `WEBHOOK_URL` environment variable.

The application is not intended to be run as a server but invoked on a recurring basis from a scheduler like cron or Heroku Scheduler.

## Setup

### Local (Docker)

```
export YNAB_API_TOKEN=123 WEBHOOK_URL=https://mydomain.com/ynab-webhook-receive
docker-compose up --build --exit-code-from app
```

### Heroku

The `heroku.yml` manifest file is used to define a Heroku application stack.  The `run` command in heroku.yml will reference the `SCHEDULE_INTERNAL_SECONDS` environment variable (default: 30) and run this app on an internal in the Heroku environment.

**Provisioning (one time)**

```
heroku create ynab-api-webhooks --manifest
heroku config:set YNAB_API_TOKEN=123 WEBHOOK_URL=https://mydomain.com/ynab-webhook-receive
```

**Deploying**

```
git push heroku master
heroku scale app=1
```

## Environment Variables

- **YNAB_API_TOKEN** - The [YNAB API access token](https://api.youneedabudget.com/#personal-access-tokens) (**required**) 
- **WEBHOOK_URL** - The URL to post changes to. (**required**) 
- **BUDGET_ID** - The YNAB budget id to monitor.  (*default: "last-used"*)
- **REDIS_URL** - The Redis server URL to connect to Redis.  (*default: "redis://localhost"*)
