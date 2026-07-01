export default function DashboardLoading() {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-amber-600"
        aria-hidden
      />
      載入中…
    </div>
  );
}
