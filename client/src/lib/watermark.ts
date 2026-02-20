import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function drawWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    location: string,
    userName: string
) {
    // 1. Draw Gradient Background at bottom 
    const footerHeight = Math.max(150, height * 0.25); // Enough space for 3 lines + Logo

    const gradient = ctx.createLinearGradient(0, height - footerHeight, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.0)"); // Fade in
    gradient.addColorStop(0.3, "rgba(0, 0, 0, 0.6)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - footerHeight, width, footerHeight);

    const padding = width * 0.04;
    let textX = padding;

    // 2. Load and Draw Logo (Gold/White logo)
    let logoWidth = 0;
    try {
        const logo = await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
            img.src = "/logo.png";
        });

        if (logo.width > 0) {
            const logoSize = footerHeight * 0.55;
            const logoY = height - footerHeight + (footerHeight * 0.1); // Top aligned in footer
            const logoAspect = logo.width / logo.height;
            logoWidth = logoSize * logoAspect;

            ctx.drawImage(logo, padding, logoY, logoWidth, logoSize);
            // textX will be after the logo
        }

    } catch (e) {
        console.error("Logo load error:", e);
    }

    // 3. Draw Text
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Dynamic font sizing
    const fontSizeName = Math.max(22, height * 0.045);
    const fontSizeDate = Math.max(18, height * 0.038);
    const fontSizeLoc = Math.max(14, height * 0.03);

    const now = new Date();
    const dateStr = format(now, "EEEE, d MMMM yyyy", { locale: id });
    const timeStr = format(now, "HH:mm:ss", { locale: id });

    // Calculate positions
    const startY = height - footerHeight + (footerHeight * 0.15);
    const lineHeight = footerHeight * 0.28;

    // Line 1: [Logo] | Nama
    const nameX = logoWidth > 0 ? padding + logoWidth + (padding / 2) : padding;

    // Draw separator if logo exists
    if (logoWidth > 0) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding + logoWidth + (padding / 4), startY);
        ctx.lineTo(padding + logoWidth + (padding / 4), startY + fontSizeName * 1.2);
        ctx.stroke();
    }

    ctx.font = `900 ${fontSizeName}px sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText(userName || "ABSENSI NH", nameX, startY);

    // Line 2: Hari Tanggal | Jam
    ctx.font = `600 ${fontSizeDate}px sans-serif`;
    ctx.shadowBlur = 4;
    ctx.fillText(`${dateStr} | ${timeStr}`, padding, startY + lineHeight);

    // Line 3: Alamat
    ctx.font = `400 ${fontSizeLoc}px sans-serif`;
    ctx.shadowBlur = 2;
    const locText = location || "Mendeteksi Lokasi...";

    // Multi-line address wrap or truncate
    const maxTextWidth = width - (padding * 2);
    let displayLoc = locText;

    if (ctx.measureText(locText).width > maxTextWidth) {
        const avgCharWidth = ctx.measureText("A").width;
        const maxChars = Math.floor(maxTextWidth / avgCharWidth);
        displayLoc = locText.substring(0, maxChars - 3) + "...";
    }
    ctx.fillText(displayLoc, padding, startY + (lineHeight * 1.9));
}
