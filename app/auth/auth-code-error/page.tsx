import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          Đăng nhập không thành công
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Đã xảy ra lỗi trong quá trình xác thực với Google. Vui lòng thử lại.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-zalo-blue px-5 py-2.5 font-medium text-white transition hover:bg-zalo-blue-dark"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
