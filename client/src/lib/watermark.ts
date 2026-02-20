import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function drawWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    location: string,
    userName: string
) {
    // 1. Draw Semi-transparent background at bottom 
    // Height depends on resolution. 
    const footerHeight = Math.max(120, height * 0.2); // Increased height for 3 lines

    // Gradient background for better visibility
    const gradient = ctx.createLinearGradient(0, height - footerHeight, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.5)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - footerHeight, width, footerHeight);

    const padding = width * 0.03;
    let textX = padding;

    // 2. Load and Draw Logo
    try {
        const logo = await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
            img.src = "/logo.png"; // Changed path to new logo in public folder
        });

        if (logo.width > 0) {
            const logoSize = footerHeight * 0.8;
            const logoY = height - footerHeight + (footerHeight - logoSize) / 2;
            const logoAspect = logo.width / logo.height;
            const logoWidth = logoSize * logoAspect;

            ctx.drawImage(logo, padding, logoY, logoWidth, logoSize);
            textX = padding + logoWidth + padding;
        }

    } catch (e) {
        console.error("Logo load error:", e);
    }

    // 3. Draw Text
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Dynamic font sizing
    const fontSizeName = Math.max(16, height * 0.04);
    const fontSizeDate = Math.max(12, height * 0.03);
    const fontSizeLoc = Math.max(10, height * 0.025);

    const now = new Date();
    const dateStr = format(now, "EEEE, d MMMM yyyy", { locale: id });
    const timeStr = format(now, "HH:mm:ss", { locale: id });

    // Calculate Y positions
    const startY = height - footerHeight + (footerHeight * 0.15);
    const lineHeight = footerHeight * 0.25;

    // Line 1: Nama
    ctx.font = `bold ${fontSizeName}px sans-serif`;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2;
    ctx.fillText(userName || "User", textX, startY);

    // Line 2: Hari Tanggal | Jam
    ctx.font = `${fontSizeDate}px sans-serif`;
    ctx.fillText(`${dateStr} | ${timeStr}`, textX, startY + lineHeight);

    // Line 3: Alamat
    ctx.font = `${fontSizeLoc}px sans-serif`;
    const locText = location || "Lokasi tidak tersedia";

    // Truncate logic
    const maxTextWidth = width - textX - padding;
    let displayLoc = locText;
    if (ctx.measureText(locText).width > maxTextWidth) {
        const avgCharWidth = ctx.measureText("A").width;
        const maxChars = Math.floor(maxTextWidth / avgCharWidth);
        displayLoc = locText.substring(0, maxChars - 3) + "...";
    }
    ctx.fillText(displayLoc, textX, startY + lineHeight * 2);
}
