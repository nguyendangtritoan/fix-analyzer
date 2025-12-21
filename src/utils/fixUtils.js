export const getTagName = (tag, tagDict) => tagDict[tag] || String(tag);

export const getHumanValue = (tag, value, enumDict) => {
  if (enumDict[tag] && enumDict[tag][value]) {
    return { val: value, desc: enumDict[tag][value] };
  }
  return { val: value, desc: null };
};

export const copyToClipboard = (text) => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; 
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    console.error("Failed to copy", err);
    return false;
  }
};

export const generateOutput = (data, format, tags) => {
  if (!data || data.length === 0) return "";
  
  switch (format) {
    case 'pipe':
      return data.map(p => `${p.tag}=${p.value}`).join('|');
    case 'soh':
      return data.map(p => `${p.tag}=${p.value}`).join('\u0001');
    case 'bracketed':
      return data.map(p => {
        const tagName = tags[p.tag] || String(p.tag);
        const paddedName = tagName.padEnd(20, ' ');
        return `<${p.tag}> ${paddedName} = ${p.value}`;
      }).join('\n');
    case 'columnar':
      return data.map(p => {
        const tagName = tags[p.tag] || String(p.tag);
        return `${tagName.padEnd(30, ' ')}${String(p.tag).padEnd(8, ' ')}${p.value}`;
      }).join('\n');
    case 'json':
      const simpleObj = data.reduce((acc, p) => ({ ...acc, [p.tag]: p.value }), {});
      return JSON.stringify(simpleObj, null, 2);
    default:
      return "";
  }
};
