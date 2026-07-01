export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="animate-fade-in-up rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      {message}
    </div>
  );
}
