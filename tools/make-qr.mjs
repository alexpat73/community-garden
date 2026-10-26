// Makes the QR code on the desktop home page that opens the app on a phone:
//   node tools/make-qr.mjs
// Uses the qrcode package (MIT), a dev dependency only: the site just shows the SVG.

import QRCode from "qrcode";
import { writeFile } from "node:fs/promises";

const APP_URL = "https://alexpat73.github.io/community-garden/app.html";
const svg = await QRCode.toString(APP_URL, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 2, // the white border scanners need
  color: { dark: "#1F271D", light: "#FAF7F0" },
});
await writeFile(new URL("../images/qr-app.svg", import.meta.url), svg);
console.log(`Wrote images/qr-app.svg for ${APP_URL}`);
