import { DEFAULT_TAGS, DEFAULT_ENUMS } from '../constants/fixData';

export const parseQuickFixXml = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  const newTags = { ...DEFAULT_TAGS };
  const newEnums = { ...DEFAULT_ENUMS };
  const newGroups = {}; 

  console.log("DEBUG: Starting XML Parse...");

  // 1. Build Name Map (Initialize with Defaults to ensure standard tags are resolved)
  const nameToNum = {};
  Object.entries(DEFAULT_TAGS).forEach(([tag, name]) => {
    nameToNum[name] = parseInt(tag);
  });

  // Extract Field Definitions from XML
  const fieldDefs = xmlDoc.getElementsByTagName("field");
  
  for (let i = 0; i < fieldDefs.length; i++) {
    const field = fieldDefs[i];
    const numberStr = field.getAttribute("number");
    const name = field.getAttribute("name");
    
    if (numberStr && name) {
      const number = parseInt(numberStr);
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

  // 2. Index Components (Reusable blocks)
  const componentMap = {};
  const componentsRoot = xmlDoc.getElementsByTagName("components")[0];
  if (componentsRoot) {
    for (let i = 0; i < componentsRoot.children.length; i++) {
        const compNode = componentsRoot.children[i];
        if (compNode.tagName === 'component') {
            componentMap[compNode.getAttribute("name")] = compNode;
        }
    }
  }
  console.log("DEBUG: Components Indexed:", Object.keys(componentMap));

  // Helper: Recursively flatten a node's children into a list of Field IDs
  const resolveFields = (node, visited) => {
    let fields = [];
    const currentVisited = new Set(visited);
    
    if (currentVisited.has(node)) return fields;
    currentVisited.add(node);

    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const tagName = child.tagName;
        const name = child.getAttribute("name");

        if (tagName === 'field' || tagName === 'group') {
            const num = parseInt(child.getAttribute("number")) || nameToNum[name];
            if (num) {
                fields.push(num);
            } else {
                console.warn(`DEBUG: Could not resolve Tag ID for field '${name}' inside ${node.getAttribute('name') || 'unknown'}`);
            }
        } else if (tagName === 'component') {
            const refName = child.getAttribute("name");
            const compDef = componentMap[refName];
            if (compDef) {
                console.log(`DEBUG: Expanding component '${refName}' inside ${node.getAttribute('name') || 'parent'}`);
                fields = fields.concat(resolveFields(compDef, currentVisited));
            } else {
                console.warn(`DEBUG: Component reference '${refName}' not found in dictionary.`);
            }
        }
    }
    return fields;
  };

  // 3. Extract Groups (from Messages and Components)
  const groupNodes = xmlDoc.getElementsByTagName("group");
  for (let i=0; i<groupNodes.length; i++) {
     const gNode = groupNodes[i];
     const name = gNode.getAttribute("name");
     const number = parseInt(gNode.getAttribute("number")) || nameToNum[name];
     
     if (number) {
        const childTags = resolveFields(gNode, new Set());
        
        if (childTags.length > 0) {
           newGroups[number] = { delimiter: childTags[0], fields: childTags };
           console.log(`DEBUG: Group ${number} (${name}) loaded. Fields: [${childTags.join(', ')}]`);
        } else {
           console.warn(`DEBUG: Group ${number} (${name}) has no resolved fields.`);
        }
     }
  }

  return { tags: newTags, enums: newEnums, groups: newGroups };
};

export const parseFixMessage = (raw) => {
  if (!raw || !raw.trim()) return [];
  let pairs = [];
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
  const isColumnar = lines.some(l => /^[A-Za-z0-9_]+\s+\d+\s+/.test(l.trim()));
  if (isColumnar) {
    lines.forEach(line => {
      const match = line.trim().match(/^[\w\d\s&.]+\s+(\d+)\s+(.*)$/);
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

// --- Recursive Grouping Logic ---

const skipGroup = (startIndex, pairs, groupDef, allGroups) => {
  let i = startIndex;
  const countTagPair = pairs[i - 1]; 
  const count = parseInt(countTagPair.value) || 0;
  
  const groupFieldsSet = new Set(groupDef.fields);
  let processedInstances = 0;

  while (i < pairs.length && processedInstances < count) {
    if (pairs[i].tag !== groupDef.delimiter) break; 
    i++; 

    while (i < pairs.length) {
      const tag = pairs[i].tag;
      if (tag === groupDef.delimiter) break;

      if (groupFieldsSet.has(tag)) {
        i++; 
        if (allGroups[tag]) {
           i = skipGroup(i, pairs, allGroups[tag], allGroups);
        }
      } else {
        break;
      }
    }
    processedInstances++;
  }
  return i;
};

export const groupify = (pairs, groupDefs) => {
  const result = [];
  let i = 0;

  while (i < pairs.length) {
    const p = pairs[i];
    const def = groupDefs[p.tag];

    if (def) {
      const count = parseInt(p.value) || 0;
      console.log(`DEBUG: Processing Group ${p.tag}. Expecting ${count} instances.`);
      
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
      
      while (i < pairs.length && safetyCount < count) {
        const instancePairs = [];
        
        // STRICT: First tag must be delimiter
        if (pairs[i].tag !== def.delimiter) {
            console.log(`DEBUG: Group ${p.tag} instance ${safetyCount + 1} break: Next tag ${pairs[i].tag} is not delimiter ${def.delimiter}`);
            break; 
        }

        instancePairs.push(pairs[i]);
        i++;

        while (i < pairs.length) {
          const nextTag = pairs[i].tag;
          if (nextTag === def.delimiter) break;
          
          if (groupFieldsSet.has(nextTag)) {
             instancePairs.push(pairs[i]);
             i++;
             
             if (groupDefs[nextTag]) {
                // Log that we found a nested group definition
                console.log(`DEBUG: Found nested group start ${nextTag} inside ${p.tag}`);
                const subGroupDef = groupDefs[nextTag];
                const endIndex = skipGroup(i, pairs, subGroupDef, groupDefs);
                while (i < endIndex) {
                   instancePairs.push(pairs[i]);
                   i++;
                }
             }
          } else {
             console.log(`DEBUG: Group ${p.tag} break: Tag ${nextTag} not in definition. Instance ended.`);
             break;
          }
        }
        
        const processedInstance = groupify(instancePairs, groupDefs);
        groupNode.instances.push(processedInstance);
        safetyCount++;
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