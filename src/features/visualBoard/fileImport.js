const COMPRESSED_EXTENSION = /\.(?:bz2|gz|zip|7z|rar|xz|zst)$/i;
const TEXT_LOG_NAME = /(?:\.log(?:[.-].*)?|\.txt|\.fix)$/i;

const compareFiles = (left, right) => {
  const leftPath = left.webkitRelativePath || left.name;
  const rightPath = right.webkitRelativePath || right.name;
  const nameComparison = leftPath.localeCompare(rightPath, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (nameComparison) return nameComparison;
  return (left.lastModified || 0) - (right.lastModified || 0);
};

export const prepareLocalLogFiles = fileList => {
  const files = Array.from(fileList || []).filter(Boolean).sort(compareFiles);
  if (!files.length) return { files: [], totalBytes: 0, sourceName: null, error: null };

  for (const file of files) {
    if (COMPRESSED_EXTENSION.test(file.name)) {
      return {
        files: [],
        totalBytes: 0,
        sourceName: null,
        error: `${file.name} is compressed. Decompress it locally and select the plain log files.`,
      };
    }
    if (!TEXT_LOG_NAME.test(file.name) && file.type && !file.type.startsWith('text/')) {
      return {
        files: [],
        totalBytes: 0,
        sourceName: null,
        error: `${file.name} is not an uncompressed .log, .txt, or .fix text file.`,
      };
    }
  }

  const totalBytes = files.reduce((total, file) => total + Number(file.size || 0), 0);
  return {
    files,
    totalBytes,
    sourceName: files.length === 1 ? files[0].name : `${files.length} local files`,
    error: null,
  };
};

export const combineLocalLogFiles = files => {
  const parts = [];
  files.forEach((file, index) => {
    if (index) parts.push('\n');
    parts.push(file);
  });
  return new Blob(parts, { type: 'text/plain' }).text();
};
