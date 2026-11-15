'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm" role="alert">
        <h1 className="text-2xl font-bold text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Quant View hit an unexpected error. Holdings saved in this browser are still on this device.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
