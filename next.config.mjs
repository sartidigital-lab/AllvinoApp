import path from "node:path";
import { fileURLToPath } from "node:url";
import "./src/env.mjs";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/catalogo.html", destination: "/catalogo", permanent: true },
      { source: "/checkout.html", destination: "/checkout", permanent: true },
      { source: "/conta.html", destination: "/conta", permanent: true },
      { source: "/promocao.html", destination: "/catalogo", permanent: true },
      { source: "/login.html", destination: "/", permanent: true },
      { source: "/cadastro.html", destination: "/", permanent: true },
      { source: "/recuperar-senha.html", destination: "/", permanent: true },
      { source: "/admin.html", destination: "/admin", permanent: true },
      { source: "/admin-login.html", destination: "/admin", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
