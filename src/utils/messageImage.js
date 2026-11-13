import { getCaptureDimensions } from './messageCapture';

// Only the app's text/table/SVG message panel is captured. There are no remote assets
// or web fonts to fetch, and no external screenshot service or runtime dependency.
const STYLE_PROPERTIES = [
  'display', 'box-sizing', 'width', 'height', 'min-width', 'max-width',
  'margin', 'padding', 'border', 'border-radius', 'border-collapse', 'border-spacing',
  'background-color', 'color', 'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration',
  'white-space', 'word-break', 'overflow-wrap', 'vertical-align', 'table-layout',
  'align-items', 'align-self', 'justify-content', 'flex', 'flex-direction', 'gap',
  'box-shadow', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
];

const cloneWithStyles = element => {
  const clone = element.cloneNode(false);
  const style = getComputedStyle(element);
  for (const property of STYLE_PROPERTIES) clone.style.setProperty(property, style.getPropertyValue(property));
  for (const child of element.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      if (!child.classList.contains('sr-only')) clone.append(cloneWithStyles(child));
    } else clone.append(child.cloneNode(true));
  }
  return clone;
};

export const createMessageImage = async element => {
  await document.fonts.ready;
  const width = Math.ceil(element.getBoundingClientRect().width);
  const height = Math.ceil(element.getBoundingClientRect().height);
  const dimensions = getCaptureDimensions(width, height);
  const clone = cloneWithStyles(element);
  const xml = new XMLSerializer().serializeToString(clone);
  // A data URL keeps SVG rasterization origin-clean and is allowed by the existing CSP.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('The browser could not render this image. Try a smaller range.'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image capture is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The browser could not create this image. Try a smaller range.');
    return { blob, url: canvas.toDataURL('image/png'), ...dimensions };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
};

export const downloadMessageImage = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
