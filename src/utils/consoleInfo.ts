export function printConsoleInfo() {
  const version = import.meta.env.VITE_APP_VERSION || "dev";
  const author = "Lucas Inácio";
  const repo = "https://github.com/luc118i";

  console.log(
    "%cPainel Operacional",
    "color: #1e3a8a; font-size: 22px; font-weight: bold;"
  );

  console.log(
    "%cVersão:%c " + version,
    "color: #2563eb; font-weight: bold;",
    "color: #0ea5e9; font-weight: 600;"
  );

  console.log(
    "%cCriador:%c " + author,
    "color: #16a34a; font-weight: bold;",
    "color: #22c55e; font-weight: 600;"
  );

  console.log(
    "%cGitHub:%c " + repo,
    "color: #0891b2; font-weight: bold;",
    "color: #06b6d4; font-weight: 600;"
  );

  console.log(
    "%cObrigado por utilizar o sistema!",
    "color: #16a34a; font-size: 12px; font-weight: bold; margin-top: 6px;"
  );
}
