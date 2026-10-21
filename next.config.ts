import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit', 'nodemailer', 'imapflow', 'mailparser'],
};

export default nextConfig;
