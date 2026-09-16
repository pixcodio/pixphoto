import { FilterType, TemplateType } from './types';

export interface RenderMagazineOptions {
  photos: string[]; // array of base64 data URLs
  participantNames: string[];
  template: TemplateType;
  filter: FilterType;
  roomCode: string;
  issueDate?: string;
  width?: number;
  height?: number;
}

// Helper to load image
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Draw procedural grain texture
function drawGrain(ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number = 0.05) {
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 120;
  grainCanvas.height = 120;
  const gCtx = grainCanvas.getContext('2d');
  if (!gCtx) return;

  const imgData = gCtx.createImageData(120, 120);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.random() * 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 40;
  }
  gCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.globalAlpha = opacity;
  const pattern = ctx.createPattern(grainCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

// Draw simulated authentic barcode
function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isDarkTheme: boolean
) {
  ctx.save();
  ctx.fillStyle = isDarkTheme ? '#ffffff' : '#111111';

  const barPattern = [
    2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2,
    3, 1, 2, 4, 1, 1, 3, 2, 1, 2, 1, 3, 2, 4, 1, 2, 1, 3, 1, 2, 2, 1, 3, 2, 1,
  ];
  let curX = x;
  const totalUnits = barPattern.reduce((a, b) => a + b, 0);
  const unitWidth = width / totalUnits;

  for (let i = 0; i < barPattern.length; i++) {
    const barWidth = barPattern[i] * unitWidth;
    if (i % 2 === 0) {
      ctx.fillRect(curX, y, barWidth, height - 12);
    }
    curX += barWidth;
  }

  // Barcode number text
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('9 771234 567008', x + width / 2, y + height);
  ctx.restore();
}

// Crop and draw image maintaining aspect ratio (object-fit: cover)
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 0
) {
  ctx.save();

  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
  }

  const imgRatio = img.width / img.height;
  const targetRatio = w / h;

  let sx, sy, sw, sh;
  if (imgRatio > targetRatio) {
    sh = img.height;
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function applyFilterToContext(ctx: CanvasRenderingContext2D, filter: FilterType) {
  switch (filter) {
    case 'bw':
      ctx.filter = 'grayscale(100%) contrast(125%) brightness(95%)';
      break;
    case 'warm':
      ctx.filter = 'sepia(35%) contrast(108%) brightness(105%) saturate(110%)';
      break;
    case 'cool':
      ctx.filter = 'contrast(120%) brightness(110%) hue-rotate(185deg) saturate(85%)';
      break;
    case 'grain':
      ctx.filter = 'contrast(115%) brightness(95%) saturate(90%)';
      break;
    case 'normal':
    default:
      ctx.filter = 'none';
      break;
  }
}

export async function renderMagazineToCanvas(
  options: RenderMagazineOptions
): Promise<HTMLCanvasElement> {
  const {
    photos,
    participantNames,
    template,
    filter,
    roomCode,
    issueDate = new Date().toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    }),
    width = 1200,
    height = 1800,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  // Load all images in parallel
  const loadedImages: HTMLImageElement[] = [];
  for (const photoUrl of photos) {
    try {
      const img = await loadImage(photoUrl);
      loadedImages.push(img);
    } catch (e) {
      console.error('Failed to load photo image:', e);
    }
  }

  if (template === 'editorial-haute') {
    renderEditorialHaute(ctx, width, height, loadedImages, participantNames, filter, roomCode, issueDate);
  } else {
    renderIndieArchive(ctx, width, height, loadedImages, participantNames, filter, roomCode, issueDate);
  }

  return canvas;
}

// TEMPLATE 1: EDITORIAL HAUTE (Vogue / Harper's Bazaar luxury aesthetic)
function renderEditorialHaute(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  images: HTMLImageElement[],
  names: string[],
  filter: FilterType,
  roomCode: string,
  issueDate: string
) {
  // Background: Warm Ivory Paper
  ctx.fillStyle = '#FBF9F5';
  ctx.fillRect(0, 0, w, h);

  // Outer border
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  // Thin inner border line
  ctx.strokeStyle = 'rgba(34,34,34,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, w - 88, h - 88);

  // Header / Eyebrow
  ctx.fillStyle = '#111111';
  ctx.font = '600 13px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.letterSpacing = '5px';
  ctx.textAlign = 'center';
  ctx.fillText('PIXPHOTO INTERNATIONAL • SPECIAL EDITORIAL', w / 2, 78);

  ctx.font = '400 11px var(--font-mono, monospace)';
  ctx.letterSpacing = '2px';
  ctx.fillText(`ROOM: ${roomCode} • VOL. XXIV`, w / 2, 98);

  // Main Masthead: PIX VOGUE
  ctx.font = 'italic 700 88px var(--font-serif, "Playfair Display", Didot, serif)';
  ctx.letterSpacing = '12px';
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.fillText('PIX VOGUE', w / 2 + 6, 185);

  // Header Separator line
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 208);
  ctx.lineTo(w - 60, 208);
  ctx.stroke();

  // Subheader Tagline
  ctx.font = '500 12px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'left';
  ctx.fillText('THE NEW ELEGANCE: MODERN PORTRAITURE', 60, 228);

  ctx.textAlign = 'right';
  ctx.fillText(issueDate.toUpperCase(), w - 60, 228);

  // Photo Framing Area
  const photoBox = {
    x: 60,
    y: 245,
    w: w - 120,
    h: h - 450,
  };

  ctx.save();
  applyFilterToContext(ctx, filter);

  const imgCount = images.length;

  if (imgCount === 0) {
    // Placeholder if no photo
    ctx.fillStyle = '#eae7df';
    ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
  } else if (imgCount === 1) {
    // 1 Photo: Full Cover Hero
    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, photoBox.w, photoBox.h);
  } else if (imgCount === 2) {
    // 2 Photos: Side-by-side vertical diptych
    const gap = 16;
    const colW = (photoBox.w - gap) / 2;
    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, colW, photoBox.h);
    drawImageCover(ctx, images[1], photoBox.x + colW + gap, photoBox.y, colW, photoBox.h);
  } else if (imgCount === 3) {
    // 3 Photos: 1 Hero on left, 2 stacked on right
    const gap = 16;
    const leftW = photoBox.w * 0.58;
    const rightW = photoBox.w - leftW - gap;
    const rightH = (photoBox.h - gap) / 2;

    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, leftW, photoBox.h);
    drawImageCover(ctx, images[1], photoBox.x + leftW + gap, photoBox.y, rightW, rightH);
    drawImageCover(ctx, images[2], photoBox.x + leftW + gap, photoBox.y + rightH + gap, rightW, rightH);
  } else {
    // 4 Photos: 2x2 Quadrant Grid
    const gap = 16;
    const colW = (photoBox.w - gap) / 2;
    const rowH = (photoBox.h - gap) / 2;

    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, colW, rowH);
    drawImageCover(ctx, images[1], photoBox.x + colW + gap, photoBox.y, colW, rowH);
    drawImageCover(ctx, images[2], photoBox.x, photoBox.y + rowH + gap, colW, rowH);
    drawImageCover(ctx, images[3], photoBox.x + colW + gap, photoBox.y + rowH + gap, colW, rowH);
  }

  ctx.restore();

  // Photo thin borders
  ctx.strokeStyle = 'rgba(17,17,17,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);

  // Bottom Editorial Section
  const bottomY = photoBox.y + photoBox.h + 28;

  // Editorial Callouts / Headlines
  ctx.fillStyle = '#111111';
  ctx.font = 'italic 700 24px var(--font-serif, "Playfair Display", serif)';
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'left';
  ctx.fillText('“A Symphony of Faces Across the Distance”', 60, bottomY);

  ctx.font = '500 12px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.letterSpacing = '3px';
  ctx.fillText('FEATURING:', 60, bottomY + 28);

  // Participant Names
  ctx.font = '600 14px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.letterSpacing = '1px';
  const nameString = names.length > 0 ? names.join('  •  ').toUpperCase() : 'THE ENSEMBLE';
  ctx.fillText(nameString, 60, bottomY + 50);

  ctx.font = '400 11px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.fillStyle = '#666666';
  ctx.letterSpacing = '1px';
  ctx.fillText('REMOTE PHOTOBOOTH SESSION • POWERED BY PIXPHOTO', 60, bottomY + 70);

  // Right Side Barcode & Price
  drawBarcode(ctx, w - 190, bottomY - 5, 130, 52, false);

  ctx.fillStyle = '#111111';
  ctx.font = '600 12px var(--font-mono, monospace)';
  ctx.textAlign = 'right';
  ctx.fillText('$12.50 USD / IDR 55.000', w - 60, bottomY + 70);

  // Bottom Copyright Footnote
  ctx.font = '400 10px var(--font-mono, monospace)';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.fillText('L’ÉDITION SPÉCIALE • REPRODUCED WITH PERMISSION • ALL RIGHTS RESERVED', w / 2, h - 45);

  // Optional Grain Overlay
  if (filter === 'grain' || filter === 'warm') {
    drawGrain(ctx, w, h, 0.06);
  }
}

// TEMPLATE 2: INDIE ARCHIVE / Y2K ZINE (Dazed / Kinfolk / Pop Retro)
function renderIndieArchive(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  images: HTMLImageElement[],
  names: string[],
  filter: FilterType,
  roomCode: string,
  issueDate: string
) {
  // Background: Deep Charcoal Noir
  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, w, h);

  // Film Sprocket Holes along left and right edges
  ctx.fillStyle = '#1c1e24';
  const sprocketH = 22;
  const sprocketW = 14;
  const sprocketGap = 42;
  for (let y = 30; y < h - 40; y += sprocketGap) {
    ctx.fillRect(16, y, sprocketW, sprocketH);
    ctx.fillRect(w - 30, y, sprocketW, sprocketH);
  }

  // Inner container
  const innerX = 46;
  const innerW = w - 92;

  // Masthead Header Tag: [ ARCHIVE // 04 ]
  ctx.fillStyle = '#ffe600'; // Neon accent tag
  ctx.fillRect(innerX, 42, 110, 24);

  ctx.fillStyle = '#000000';
  ctx.font = '800 11px var(--font-mono, monospace)';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('LIMITED ZINE', innerX + 55, 58);

  ctx.fillStyle = '#f0ede6';
  ctx.font = '900 64px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'left';
  ctx.fillText('ARCHIVE // 04', innerX, 130);

  // Stamp: APPROVED
  ctx.save();
  ctx.translate(w - 180, 85);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(0, 0, 115, 34);

  ctx.fillStyle = '#e63946';
  ctx.font = '800 13px var(--font-mono, monospace)';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillText('APPROVED', 57, 22);
  ctx.restore();

  // Subtitle info
  ctx.fillStyle = '#8f95a3';
  ctx.font = '600 12px var(--font-mono, monospace)';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'left';
  ctx.fillText(`ROOM: ${roomCode} | CUT 04_INDIE`, innerX, 158);

  ctx.textAlign = 'right';
  ctx.fillText(`DATE: ${issueDate.toUpperCase()}`, w - innerX, 158);

  // Divider Line
  ctx.strokeStyle = '#2d313b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(innerX, 172);
  ctx.lineTo(w - innerX, 172);
  ctx.stroke();

  // Photo Area
  const photoBox = {
    x: innerX,
    y: 190,
    w: innerW,
    h: h - 410,
  };

  ctx.save();
  applyFilterToContext(ctx, filter);

  const imgCount = images.length;
  const gap = 14;

  if (imgCount === 0) {
    ctx.fillStyle = '#22252c';
    ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
  } else if (imgCount === 1) {
    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, photoBox.w, photoBox.h, 4);
  } else if (imgCount === 2) {
    // 2 Photos: Vertical Split
    const colW = (photoBox.w - gap) / 2;
    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, colW, photoBox.h, 4);
    drawImageCover(ctx, images[1], photoBox.x + colW + gap, photoBox.y, colW, photoBox.h, 4);
  } else if (imgCount === 3) {
    // 3 Photos: 1 Hero top horizontal, 2 bottom
    const topH = photoBox.h * 0.52;
    const botH = photoBox.h - topH - gap;
    const botW = (photoBox.w - gap) / 2;

    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, photoBox.w, topH, 4);
    drawImageCover(ctx, images[1], photoBox.x, photoBox.y + topH + gap, botW, botH, 4);
    drawImageCover(ctx, images[2], photoBox.x + botW + gap, photoBox.y + topH + gap, botW, botH, 4);
  } else {
    // 4 Photos: 2x2 Photostrip Grid
    const colW = (photoBox.w - gap) / 2;
    const rowH = (photoBox.h - gap) / 2;

    drawImageCover(ctx, images[0], photoBox.x, photoBox.y, colW, rowH, 4);
    drawImageCover(ctx, images[1], photoBox.x + colW + gap, photoBox.y, colW, rowH, 4);
    drawImageCover(ctx, images[2], photoBox.x, photoBox.y + rowH + gap, colW, rowH, 4);
    drawImageCover(ctx, images[3], photoBox.x + colW + gap, photoBox.y + rowH + gap, colW, rowH, 4);
  }

  ctx.restore();

  // Draw Frame Numbers & Polaroid labels
  ctx.fillStyle = '#ffe600';
  ctx.font = '700 11px var(--font-mono, monospace)';
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'left';

  const frameY = photoBox.y + photoBox.h + 24;
  ctx.fillText('EXP. 400 ISO // 35MM RETRO FILM', innerX, frameY);

  // Digital timestamp in bright orange (classic camera stamp)
  const now = new Date();
  const dateStamp = `'${String(now.getFullYear()).slice(-2)} ${String(now.getMonth() + 1).padStart(2, '0')} ${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  ctx.fillStyle = '#ff7b00';
  ctx.font = '700 16px var(--font-mono, monospace)';
  ctx.textAlign = 'right';
  ctx.fillText(dateStamp, w - innerX, frameY);

  // Credits Box
  const creditsY = frameY + 24;
  ctx.fillStyle = '#1c1f26';
  ctx.fillRect(innerX, creditsY, innerW, 80);

  ctx.strokeStyle = '#2d3340';
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX, creditsY, innerW, 80);

  ctx.fillStyle = '#f0ede6';
  ctx.font = '700 13px var(--font-sans, "Plus Jakarta Sans", sans-serif)';
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'left';
  ctx.fillText('COLLABORATIVE CAST:', innerX + 16, creditsY + 28);

  ctx.font = '500 13px var(--font-mono, monospace)';
  ctx.fillStyle = '#a0a8b8';
  const namesDisplay = names.length > 0 ? names.join('  //  ') : 'ANONYMOUS REBELS';
  ctx.fillText(namesDisplay, innerX + 16, creditsY + 52);

  // Barcode in dark mode
  drawBarcode(ctx, w - innerX - 140, creditsY + 14, 120, 48, true);

  // Footer Tagline
  ctx.font = '500 10px var(--font-mono, monospace)';
  ctx.fillStyle = '#656d7d';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('PIXPHOTO INDIE ARCHIVE • PRODUCED FOR MEMORIES • NO DUPLICATION', w / 2, h - 35);

  // Grain / Texture
  drawGrain(ctx, w, h, 0.08);
}
