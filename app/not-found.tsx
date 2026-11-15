import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-neutral-900">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-600">That address is not part of Quant View.</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to the watchlist
        </Link>
      </div>
    </div>
  );
}
