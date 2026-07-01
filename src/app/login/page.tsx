import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/layout/brand-mark";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-gray-100 px-4">
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark centered />
          <p className="mt-3 text-sm text-gray-500">手作食品 / 飲料門市管理系統</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
