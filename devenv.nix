{ pkgs, ... }:

{
  packages = with pkgs; [
    laravel
    hurl
  ];

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
}
