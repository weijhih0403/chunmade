import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 父層路徑含中文時，鎖定專案根目錄以免誤判 workspace root
  turbopack: {
    root: process.cwd(),
  },
  /**
   * 勿將 Prisma 打进 webpack server bundle，否則可能解析到 package.json 的 browser stub，
   * 造成 prisma.employee 為 undefined（Cannot read properties of undefined reading findMany）。
   */
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
