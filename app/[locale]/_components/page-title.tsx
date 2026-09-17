export function PageTitle({ title }: { title: string }) {
  return (
    <main
      id="main-content"
      className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-16"
    >
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
        {title}
      </h1>
    </main>
  );
}
