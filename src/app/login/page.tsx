import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-amber-800">淳手作 ERP</h1>
          <p className="mt-1 text-sm text-gray-500">手作食品 / 飲料門市管理系統</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
