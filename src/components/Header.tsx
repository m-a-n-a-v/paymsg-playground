export default function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          paymsg playground
        </h1>
        <p className="text-sm text-zinc-400">
          ISO 20022 & SWIFT MT Message Tools
        </p>
      </div>
    </header>
  );
}
