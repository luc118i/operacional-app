export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-1 text-[0.65rem] text-zinc-600 dark:text-zinc-400">
        <span>
          Desenvolvido por{" "}
          <a
            href="https://github.com/luc118i"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Lucas Inácio
          </a>
        </span>

        <span className="opacity-70">
          © {new Date().getFullYear()} — Todos os direitos reservados.
        </span>
      </div>
    </footer>
  );
}
