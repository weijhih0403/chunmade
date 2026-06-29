import { ApplyForm } from "./apply-form";

export default function ApplyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-gray-100 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-amber-800">申請帳號</h1>
          <p className="mt-1 text-sm text-gray-500">申請後需經管理員審核才能登入</p>
        </div>
        <ApplyForm />
      </div>
    </div>
  );
}
