import { DEFAULT_TAGS, DEFAULT_ENUMS, DEFAULT_GROUPS } from '../constants/fixData';

export const parseQuickFixXml = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  const newTags = { ...DEFAULT_TAGS };
  const newEnums = { ...DEFAULT_ENUMS };
  const newGroups = { ...DEFAULT_GROUPS };

  // 1. Extract Field Definitions
  const fieldDefs = xmlDoc.getElementsByTagName("field");
  const nameToNum = {};
  
  for (let i = 0; i < fieldDefs.length; i++) {
    const field = fieldDefs[i];
    const number = parseInt(field.getAttribute("number"));
    const name = field.getAttribute("name");
    
    if (number && name) {
      newTags[number] = name;
      nameToNum[name] = number;
      
      const values = field.getElementsByTagName("value");
      if (values.length > 0) {
        if (!newEnums[number]) newEnums[number] = {};
        for (let j = 0; j < values.length; j++) {
          newEnums[number][values[j].getAttribute("enum")] = values[j].getAttribute("description");
        }
      }
    }
  }

  // 2. Extract Groups
  const groupNodes = xmlDoc.getElementsByTagName("group");
  for (let i=0; i<groupNodes.length; i++) {
     const gNode = groupNodes[i];
     const name = gNode.getAttribute("name");
     const number = nameToNum[name];
     
     if (number) {
        const childTags = [];
        let delimiter = null;
        for (let j=0; j<gNode.children.length; j++) {
           const child = gNode.children[j];
           const childName = child.getAttribute("name");
           const childNum = nameToNum[childName];
           if (childNum) {
              childTags.push(childNum);
              if (delimiter === null) delimiter = childNum;
           }
        }
        if (childTags.length > 0) {
           newGroups[number] = { delimiter: delimiter, fields: childTags };
        }
     }
  }

  return { tags: newTags, enums: newEnums, groups: newGroups };
};

export const parseFixMessage = (raw) => {
  if (!raw || !raw.trim()) return [];
  let pairs = [];
  // Handle ^A caret notation
  const clean = raw.replace(/\|/g, '\u0001').replace(/\^A/g, '\u0001');
  
  // Heuristic 1: Bracketed
  if (/<(\d+)>[^=]*=\s*(.*)/.test(raw)) {
    const regex = /<(\d+)>[^=]*=\s*(.*)/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      pairs.push({ tag: parseInt(match[1]), value: match[2].trim() });
    }
    return pairs;
  }

  // Heuristic 2: Columnar
  const lines = raw.split(/\r?\n/);
  const isColumnar = lines.some(l => /^[A-Za-z]+\s+\d+\s+/.test(l.trim()));
  if (isColumnar) {
    lines.forEach(line => {
      const match = line.trim().match(/^\w+\s+(\d+)\s+(.*)$/);
      if (match) {
        pairs.push({ tag: parseInt(match[1]), value: match[2].trim() });
      }
    });
    return pairs;
  }

  // Heuristic 3: Delimited
  if (!clean.includes('\u0001') && clean.includes('=')) {
     const spaceMatches = clean.match(/(\d+)=([^=\s\u0001]+)/g);
     if (spaceMatches) {
        spaceMatches.forEach(m => {
            const [k, v] = m.split('=');
            pairs.push({ tag: parseInt(k), value: v });
        });
        return pairs;
     }
  }

  const tokens = clean.split('\u0001');
  tokens.forEach(t => {
    if (t.includes('=')) {
      const parts = t.split('=');
      const key = parts[0];
      const val = parts.slice(1).join('='); 
      if (key && !isNaN(parseInt(key))) {
        pairs.push({ tag: parseInt(key), value: val });
      }
    }
  });

  return pairs;
};

export const groupify = (pairs, groupDefs) => {
  const result = [];
  let i = 0;

  while (i < pairs.length) {
    const p = pairs[i];
    const def = groupDefs[p.tag];

    if (def) {
      const count = parseInt(p.value);
      const groupNode = { 
        tag: p.tag, 
        value: p.value, 
        isGroup: true, 
        name: `Group ${p.tag}`, 
        instances: [] 
      };
      
      i++; 
      const groupFieldsSet = new Set(def.fields);
      let safetyCount = 0;
      
      while (i < pairs.length && safetyCount < (count || 999)) {
        const instancePairs = [];
        if (pairs[i].tag !== def.delimiter) break; 

        instancePairs.push(pairs[i]);
        i++;

        while (i < pairs.length) {
          const nextTag = pairs[i].tag;
          if (nextTag === def.delimiter) break;
          
          if (groupFieldsSet.has(nextTag)) {
             instancePairs.push(pairs[i]);
             i++;
          } else {
             break;
          }
        }
        
        const processedInstance = groupify(instancePairs, groupDefs);
        groupNode.instances.push(processedInstance);
        safetyCount++;
        
        if (i < pairs.length && pairs[i].tag !== def.delimiter && !groupFieldsSet.has(pairs[i].tag)) {
            break;
        }
      }
      result.push(groupNode);
    } else {
      result.push(p);
      i++;
    }
  }
  return result;
};

export const flattenForDiff = (nodes, prefix = "", depth = 0) => {
  let flat = [];
  const keyCounts = {}; 

  nodes.forEach((node) => {
    let key = `${prefix}${node.tag}`;
    if (keyCounts[key]) {
      keyCounts[key]++;
      key = `${key}_${keyCounts[key]}`;
    } else {
      keyCounts[key] = 1;
    }

    if (node.isGroup) {
      flat.push({ 
        key: key, 
        tag: node.tag, 
        value: node.value, 
        depth, 
        isHeader: true 
      });
      
      node.instances.forEach((inst, instIdx) => {
        const instFlat = flattenForDiff(inst, `${key}[${instIdx}].`, depth + 1);
        flat = flat.concat(instFlat);
      });
    } else {
      flat.push({ 
        key: key, 
        tag: node.tag, 
        value: node.value, 
        depth 
      });
    }
  });
  return flat;
};
