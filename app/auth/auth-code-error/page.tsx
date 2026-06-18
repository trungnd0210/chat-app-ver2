import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          Sign-in failed
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Something went wrong during Google authentication. Please try again.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-zalo-blue px-5 py-2.5 font-medium text-white transition hover:bg-zalo-blue-dark"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
