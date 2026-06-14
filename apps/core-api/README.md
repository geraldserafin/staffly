# Staffly core-api

JSON API backend for Staffly, built on Laravel 13. Serves no HTML — API only.

## Stack

- PHP 8.5, Laravel 13
- PostgreSQL (`staffly` database)
- PHPUnit for tests

## Setup

Run inside the repo devenv (php/composer/postgres provided):

```bash
composer install
cp .env.example .env   # then set DB credentials if they differ
php artisan key:generate
php artisan migrate
```

## Run

```bash
php artisan serve        # API at http://localhost:8000
```

Health check: `GET /up`. Smoke route: `GET /ping` → `{"message":"pong"}`.

## Routes

API routes live in `routes/api.php` and are served from the root (no `/api` prefix — the whole app is the API).

## Test

```bash
php artisan test
```
