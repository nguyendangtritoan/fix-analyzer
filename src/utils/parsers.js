import { DEFAULT_TAGS, DEFAULT_ENUMS } from '../constants/fixData';

/**
 * Main function to parse the user-uploaded QuickFIX XML.
 * Returns: { tags, enums, groups: { _global: {}, "D": {}, ... } }
 */
export const parseQuickFixXml = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid QuickFIX XML dictionary.');
  }
  
  const newTags = { ...DEFAULT_TAGS };
  const newEnums = { ...DEFAULT_ENUMS };
  const fieldTypes = {};
  const messageNames = {};
  
  // The groups object will hold schemas for specific MsgTypes and a global fallback
  // Structure: { _global: { 453:Def, ... }, "D": { 453:Def, ... }, ... }
  const newGroups = { _global: {} }; 

  // ---------------------------------------------------------
  // 1. Tag & Enum Extraction (and Name->ID Resolution Map)
  // ---------------------------------------------------------
  const nameToNum = {};
  
  // Pre-seed with defaults to handle implicit tags in XML (e.g. <field name="Symbol"/> without number)
  Object.entries(DEFAULT_TAGS).forEach(([tag, name]) => {
    nameToNum[name] = parseInt(tag);
  });

  const fieldDefs = xmlDoc.getElementsByTagName("field");
  for (let i = 0; i < fieldDefs.length; i++) {
    const field = fieldDefs[i];
    // Only process definitions (must have number)
    const numberStr = field.getAttribute("number");
    const name = field.getAttribute("name");
    
    if (numberStr && name) {
      const number = parseInt(numberStr);
      newTags[number] = name;
      nameToNum[name] = number;
      fieldTypes[number] = field.getAttribute('type') || 'STRING';
      
      // Extract Enums
      const values = field.getElementsByTagName("value");
      if (values.length > 0) {
        if (!newEnums[number]) newEnums[number] = {};
        for (let j = 0; j < values.length; j++) {
          const enumVal = values[j].getAttribute("enum");
          const enumDesc = values[j].getAttribute("description");
          if (enumVal) newEnums[number][enumVal] = enumDesc;
        }
      }
    }
  }

  // ---------------------------------------------------------
  // 2. Component Indexing
  // ---------------------------------------------------------
  const componentMap = {};
  // Only look at the root <components> block to avoid finding references
  const componentsRoot = xmlDoc.getElementsByTagName("components")[0];
  if (componentsRoot) {
    for (let i = 0; i < componentsRoot.children.length; i++) {
        const node = componentsRoot.children[i];
        if (node.tagName === 'component') {
            componentMap[node.getAttribute("name")] = node;
        }
    }
  }

  // ---------------------------------------------------------
  // 3. Recursive Structure Resolver
  // ---------------------------------------------------------
  /**
   * Recursively traverses a Node (Message, Group, or Component) to flatten its structure.
   * Returns: { fields: [tag1, tag2...], groups: { tag: GroupDef } }
   * * @param {Node} node - The DOM element to traverse
   * @param {Set} visited - Path history to prevent infinite cycles
   */
  const resolveStructure = (node, visited) => {
    let fields = []; // List of all field IDs at this level
    let groups = {}; // Map of Group Definitions found at this level (or deeper)

    // Branch-based visited check (prevent cycles, allow diamond dependencies)
    const currentVisited = new Set(visited);
    if (currentVisited.has(node)) return { fields, groups };
    currentVisited.add(node);

    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const tagName = child.tagName;
        const name = child.getAttribute("name");

        if (tagName === 'field') {
            const num = parseInt(child.getAttribute("number")) || nameToNum[name];
            if (num) fields.push(num);
        } 
        else if (tagName === 'group') {
            const num = parseInt(child.getAttribute("number")) || nameToNum[name];
            if (num) {
                fields.push(num); // Add the Group Count Tag itself to the field list
                
                // Recurse to define the group's internal structure
                const childResult = resolveStructure(child, currentVisited);
                
                // Register this group's definition
                if (childResult.fields.length > 0) {
                    groups[num] = { 
                        delimiter: childResult.fields[0], // First field is delimiter
                        fields: childResult.fields 
                    };
                }
                // Merge any nested groups discovered inside
                Object.assign(groups, childResult.groups);
            }
        } 
        else if (tagName === 'component') {
            const refName = child.getAttribute("name");
            const compDef = componentMap[refName];
            if (compDef) {
                // Flatten the component into this level
                const compResult = resolveStructure(compDef, currentVisited);
                fields = fields.concat(compResult.fields);
                Object.assign(groups, compResult.groups);
            }
        }
    }
    return { fields, groups };
  };

  // ---------------------------------------------------------
  // 4. Message Parsing (Per-MsgType Schema)
  // ---------------------------------------------------------
  const messagesRoot = xmlDoc.getElementsByTagName("messages")[0];
  let messagesFound = false;

  if (messagesRoot) {
      for (let i = 0; i < messagesRoot.children.length; i++) {
          const msgNode = messagesRoot.children[i];
          if (msgNode.tagName === 'message') {
              const msgType = msgNode.getAttribute("msgtype");
              if (msgType) {
                  messagesFound = true;
                  messageNames[msgType] = msgNode.getAttribute('name') || msgType;
                  const { groups } = resolveStructure(msgNode, new Set());
                  newGroups[msgType] = groups;
                  
                  // Merge into global fallback (Union of fields)
                  Object.keys(groups).forEach(gTag => {
                      if (newGroups._global[gTag]) {
                          // Union existing global fields with this message's specific fields
                          const merged = new Set([...newGroups._global[gTag].fields, ...groups[gTag].fields]);
                          newGroups._global[gTag].fields = Array.from(merged);
                      } else {
                          newGroups._global[gTag] = { ...groups[gTag] };
                      }
                  });
              }
          }
      }
  }

  // Fallback: If no <messages> block, scan for loose global groups
  if (!messagesFound) {
      const allGroups = xmlDoc.getElementsByTagName("group");
      for (let i = 0; i < allGroups.length; i++) {
          const gNode = allGroups[i];
          const name = gNode.getAttribute("name");
          const num = parseInt(gNode.getAttribute("number")) || nameToNum[name];
          if (num) {
              const { fields, groups } = resolveStructure(gNode, new Set());
              if (fields.length > 0) {
                  const def = { delimiter: fields[0], fields };
                  // Merge if exists
                  if (newGroups._global[num]) {
                      const merged = new Set([...newGroups._global[num].fields, ...fields]);
                      newGroups._global[num].fields = Array.from(merged);
                  } else {
                      newGroups._global[num] = def;
                  }
              }
              Object.assign(newGroups._global, groups);
          }
      }
  }

  return {
    tags: newTags,
    enums: newEnums,
    groups: newGroups,
    fieldTypes,
    messageNames,
  };
};


// ---------------------------------------------------------
// Message Parser (Format Normalizer)
// ---------------------------------------------------------
export const parseFixMessage = (raw) => {
  if (!raw || !raw.trim()) return [];
  let pairs = [];
  const soh = String.fromCharCode(1);
  
  // Normalize Delimiters (SOH, Pipe, Caret)
  const clean = raw.replace(/\|/g, soh).replace(/\^A/g, soh);
  
  // Heuristic 1: Bracketed Logs <35> MsgType = D
  if (/<(\d+)>[^=]*=\s*(.*)/.test(raw)) {
    const regex = /<(\d+)>[^=]*=\s*(.*)/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      pairs.push({ tag: parseInt(match[1]), value: match[2].trim() });
    }
    return pairs;
  }

  // Heuristic 2: Columnar (Name Tag Value)
  const lines = raw.split(/\r?\n/);
  const isColumnar = lines.some(l => /^[A-Za-z0-9_]+\s+\d+\s+/.test(l.trim()));
  if (isColumnar) {
    lines.forEach(line => {
      // Relaxed regex to catch "NoRelatedSym 146 1"
      const match = line.trim().match(/^[\w\d\s&.]+\s+(\d+)\s+(.*)$/);
      if (match) {
        pairs.push({ tag: parseInt(match[1]), value: match[2].trim() });
      }
    });
    return pairs;
  }

  // Heuristic 3: Standard Delimited
  if (!clean.includes(soh) && clean.includes('=')) {
     const fieldRegex = new RegExp(`(\\d+)=([^=\\s${soh}]+)`, 'g');
     const spaceMatches = clean.match(fieldRegex);
     if (spaceMatches) {
        spaceMatches.forEach(m => {
            const [k, v] = m.split('=');
            pairs.push({ tag: parseInt(k), value: v });
        });
        return pairs;
     }
  }

  const tokens = clean.split(soh);
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


// ---------------------------------------------------------
// Recursive Group Processor
// ---------------------------------------------------------

const inferRepeatedGroupFields = (pairs, startIndex, groupDef, count) => {
  if (count <= 1 || pairs[startIndex]?.tag !== groupDef.delimiter) return new Set();

  const groupFieldsSet = new Set(groupDef.fields);
  const delimiterIndexes = [];

  for (let i = startIndex; i < pairs.length && delimiterIndexes.length < count; i++) {
    if (pairs[i].tag === groupDef.delimiter) {
      delimiterIndexes.push(i);
    }
  }

  if (delimiterIndexes.length < 2) return new Set();

  const appearances = new Map();
  const candidateOrder = [];
  const windowCount = delimiterIndexes.length - 1;

  for (let windowIndex = 0; windowIndex < windowCount; windowIndex++) {
    const seenInWindow = new Set();
    const windowStart = delimiterIndexes[windowIndex] + 1;
    const windowEnd = delimiterIndexes[windowIndex + 1];

    for (let i = windowStart; i < windowEnd; i++) {
      const tag = pairs[i].tag;
      if (groupFieldsSet.has(tag)) continue;

      if (!appearances.has(tag)) {
        appearances.set(tag, 0);
        candidateOrder.push(tag);
      }
      seenInWindow.add(tag);
    }

    seenInWindow.forEach(tag => {
      appearances.set(tag, appearances.get(tag) + 1);
    });
  }

  return new Set(candidateOrder.filter(tag => appearances.get(tag) === windowCount));
};

const parseGroupCount = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) return 0;
  return parseInt(normalized, 10);
};

const matchesTagSequence = (pairs, startIndex, tags) => {
  if (startIndex + tags.length > pairs.length) return false;
  return tags.every((tag, offset) => pairs[startIndex + offset]?.tag === tag);
};

const inferUndefinedGroup = (pairs, countIndex) => {
  const count = parseGroupCount(pairs[countIndex]?.value);
  const firstDelimiterIndex = countIndex + 1;
  const delimiter = pairs[firstDelimiterIndex]?.tag;

  if (count <= 1 || delimiter === undefined) return null;

  const delimiterIndexes = [firstDelimiterIndex];

  for (let i = firstDelimiterIndex + 1; i < pairs.length && delimiterIndexes.length < count; i++) {
    if (pairs[i].tag === delimiter) {
      delimiterIndexes.push(i);
    }
  }

  if (delimiterIndexes.length !== count) return null;

  const fieldTags = pairs
    .slice(delimiterIndexes[0], delimiterIndexes[1])
    .map(pair => pair.tag);

  // Require at least one body field after the delimiter to avoid turning simple
  // repeated standalone tags into inferred groups.
  if (fieldTags.length < 2) return null;

  for (let i = 1; i < delimiterIndexes.length; i++) {
    if (!matchesTagSequence(pairs, delimiterIndexes[i], fieldTags)) return null;
  }

  const endIndex = delimiterIndexes[delimiterIndexes.length - 1] + fieldTags.length;
  if (pairs[endIndex]?.tag === delimiter) return null;

  return {
    delimiter,
    fields: fieldTags,
    inferred: true,
  };
};

/**
 * Advances the index past a group (and its nested subgroups) linearly.
 * Used to "jump" over nested structures so the parent loop can continue safely.
 */
const skipGroup = (startIndex, pairs, groupDef, allGroups) => {
  let i = startIndex;
  const countTagPair = pairs[i - 1]; 
  const count = parseInt(countTagPair.value) || 0;

  const inferredFields = inferRepeatedGroupFields(pairs, startIndex, groupDef, count);
  const groupFieldsSet = new Set([...groupDef.fields, ...inferredFields]);
  let processedInstances = 0;

  while (i < pairs.length && processedInstances < count) {
    // 1. Check Delimiter
    if (pairs[i].tag !== groupDef.delimiter) break; 
    i++; // Consume delimiter

    // 2. Consume Group Body
    while (i < pairs.length) {
      const tag = pairs[i].tag;
      if (tag === groupDef.delimiter) break; // Next instance start

      if (groupFieldsSet.has(tag)) {
        i++; 
        // RECURSION: If this field is ITSELF a group, skip it too
        if (allGroups[tag]) {
           i = skipGroup(i, pairs, allGroups[tag], allGroups);
        }
      } else {
        break; // Tag not in group
      }
    }
    processedInstances++;
  }
  return i;
};

/**
 * Transforms flat pairs into a hierarchical tree based on Dictionary definitions.
 */
export const groupify = (pairs, groupDefs) => {
  // 1. Determine Context (Schema)
  let activeGroups = groupDefs;
  const msgTypeTag = pairs.find(p => p.tag === 35); // MsgType
  
  if (msgTypeTag && groupDefs[msgTypeTag.value]) {
      activeGroups = groupDefs[msgTypeTag.value];
  } else if (groupDefs._global) {
      // console.log("DEBUG: Processing with global fallback schema.");
      activeGroups = groupDefs._global;
  } else {
      activeGroups = groupDefs; // Flat map fallback
  }

  const result = [];
  let i = 0;

  while (i < pairs.length) {
    const p = pairs[i];
    const def = activeGroups[p.tag] || inferUndefinedGroup(pairs, i);

    if (def) {
      // Found Group Count Tag
      const count = parseInt(p.value) || 0;
      const groupNode = { 
        tag: p.tag, 
        value: p.value, 
        isGroup: true, 
        name: `Group ${p.tag}`, 
        instances: [] 
      };
      
      i++; // Move past count tag

      const inferredFields = inferRepeatedGroupFields(pairs, i, def, count);
      const groupFieldsSet = new Set([...def.fields, ...inferredFields]);
      let safetyCount = 0;
      
      while (i < pairs.length && safetyCount < count) {
        const instancePairs = [];
        
        // Check Delimiter
        if (pairs[i].tag !== def.delimiter) {
            break; 
        }

        instancePairs.push(pairs[i]); // Add delimiter to instance
        i++;

        // Capture Body
        while (i < pairs.length) {
          const nextTag = pairs[i].tag;
          if (nextTag === def.delimiter) break; // Next instance
          
          if (groupFieldsSet.has(nextTag)) {
             instancePairs.push(pairs[i]);
             i++;
             
             // Nested Group Logic:
             // If we encounter a tag that starts a nested group, consume it fully now
             if (activeGroups[nextTag]) {
                const subGroupDef = activeGroups[nextTag];
                const endIndex = skipGroup(i, pairs, subGroupDef, activeGroups);
                
                // Add nested group tokens to current instance (will be recursed later)
                while (i < endIndex) {
                   instancePairs.push(pairs[i]);
                   i++;
                }
             }
          } else {
             break; // Tag not in group definition
          }
        }
        
        // Recursively structure this instance
        // IMPORTANT: Pass the SAME activeGroups schema down to children
        const processedInstance = groupify(instancePairs, activeGroups);
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

// UI Helper for DiffView
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
