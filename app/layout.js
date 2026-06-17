import "./globals.css";

export const metadata = {
  title: "Gridfont — a",
  description: "Draw a gridletter in the Letter Spirit tradition.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
