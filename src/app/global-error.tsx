"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-900 text-white p-8">
        <h2>Something went wrong</h2>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 bg-blue-600 rounded"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
