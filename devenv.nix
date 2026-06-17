{ pkgs, ... }:

{
  packages = with pkgs; [
    laravel
    hurl
    curl
  ];

  # End-to-end test: boot the Python OR-Tools solver, wait for it, then run the
  # core-api suite against it (the solve-path tests hit the real solver over
  # HTTP — there is no in-process stub). Tears the solver down on exit. Extra
  # args pass through to `php artisan test`, e.g. `test-e2e --filter Solve`.
  scripts.test-e2e.exec = ''
    set -euo pipefail
    port="''${SOLVER_PORT:-8765}"

    echo "→ starting solver on :$port"
    ( cd "$DEVENV_ROOT/apps/solver" && PYTHONPATH=. uvicorn app.main:app --port "$port" ) &
    solver_pid=$!
    trap 'kill "$solver_pid" 2>/dev/null || true' EXIT

    echo "→ waiting for solver health"
    for _ in $(seq 1 60); do
      if curl -sf "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
        ready=1; break
      fi
      if ! kill -0 "$solver_pid" 2>/dev/null; then
        echo "✗ solver process exited before becoming healthy" >&2; exit 1
      fi
      sleep 0.5
    done
    if [ "''${ready:-}" != "1" ]; then
      echo "✗ solver did not become healthy in time" >&2; exit 1
    fi

    echo "→ running core-api test suite against solver"
    cd "$DEVENV_ROOT/apps/core-api"
    SOLVER_URL="http://127.0.0.1:$port" php artisan test "$@"
  '';

  languages = {
    javascript = {
      enable = true;
      pnpm.enable = true;
    };
    php = {
      enable = true;
      package = pkgs.php85;
    };
    python = {
      enable = true;
      venv = {
        enable = true;
        requirements = ''
          ortools
          fastapi
          uvicorn[standard]
        '';
      };
    };
  };

  services = {
    postgres = {
      enable = true;
      port = 5432;
      listen_addresses = "127.0.0.1";
      initialDatabases = [
        {
          name = "staffly";
          user = "postgres";
          pass = "postgres";
        }
      ];
    };
  };

  # `devenv up` runs the whole stack: postgres (service above), the Python
  # solver, core-api (web + queue worker), and the Angular dev server.
  #
  # Ports: core-api :8000 (the web app's hardcoded apiBase), web :4200
  # (CORS-allowed by core-api). The solver moves to :8001 so it doesn't collide
  # with core-api on :8000, and core-api is pointed at it via SOLVER_URL.
  processes = {
    solver.exec = ''
      cd "$DEVENV_ROOT/apps/solver"
      PYTHONPATH=. exec uvicorn app.main:app --reload --port 8001
    '';

    core-api = {
      exec = ''
        cd "$DEVENV_ROOT/apps/core-api"
        php artisan migrate --force
        export SOLVER_URL="http://127.0.0.1:8001"
        exec php artisan serve --host 127.0.0.1 --port 8000
      '';
      process-compose.depends_on.postgres.condition = "process_healthy";
    };

    # Async solves (POST /schedules/{id}/solve) dispatch SolveScheduleJob onto the
    # database queue; this worker runs them. Retries until the jobs table exists.
    core-api-queue = {
      exec = ''
        cd "$DEVENV_ROOT/apps/core-api"
        export SOLVER_URL="http://127.0.0.1:8001"
        # --sleep=0: don't sleep 3s between polls, so a dispatched solve is picked
        # up immediately (solves are ~ms; the queue poll was the latency, not CP-SAT).
        exec php artisan queue:work --tries=1 --sleep=0
      '';
      process-compose = {
        depends_on.postgres.condition = "process_healthy";
        availability.restart = "on_failure";
      };
    };

    web.exec = ''
      cd "$DEVENV_ROOT/apps/web"
      exec pnpm start
    '';
  };
}
