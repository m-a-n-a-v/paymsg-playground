/**
 * Message formatting and pretty-printing utilities
 *
 * Provides functions to format MT messages, XML messages, and JSON structures
 * with proper indentation and readability improvements while preserving content.
 */

/**
 * Format an MT message with proper block structure and indentation
 *
 * @param message - Raw MT message string
 * @returns Formatted MT message with aligned fields
 */
export function formatMt(message: string): string {
  if (!message || message.trim().length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Normalize line endings
  const normalized = message.replace(/\r\n/g, '\n').trim();

  // Split into individual blocks
  const blocks: string[] = [];
  let depth = 0;
  let currentChunk = '';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (!char) continue;
    currentChunk += char;

    if (char === '{') {
      depth++;
      if (depth === 1 && currentChunk.length > 1) {
        // Start of a new top-level block
        const prevChunk = currentChunk.slice(0, -1);
        if (prevChunk.trim()) {
          blocks.push(prevChunk);
        }
        currentChunk = '{';
      }
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        // End of a top-level block
        blocks.push(currentChunk);
        currentChunk = '';
      }
    }
  }

  if (currentChunk.trim()) {
    blocks.push(currentChunk);
  }

  // Format each block
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Detect block type
    if (trimmed.startsWith('{1:')) {
      lines.push(trimmed);
    } else if (trimmed.startsWith('{2:')) {
      lines.push(trimmed);
    } else if (trimmed.startsWith('{3:')) {
      lines.push(formatBlock3(trimmed));
    } else if (trimmed.startsWith('{4:')) {
      const formatted = formatBlock4(trimmed);
      lines.push(formatted);
    } else if (trimmed.startsWith('{5:')) {
      lines.push(formatBlock5(trimmed));
    } else {
      lines.push(trimmed);
    }
  }

  return lines.join('\n');
}

/**
 * Format Block 3 (User Header) with nested tags on separate lines
 */
function formatBlock3(block: string): string {
  // Extract content between {3: and }
  const match = block.match(/^\{3:(.+)\}$/s);
  if (!match) return block;

  const content = match[1];
  if (!content) return block;

  const tags: string[] = [];

  // Extract nested tags like {108:MUR}
  const tagMatches = content.matchAll(/\{([^}]+)\}/g);
  for (const tagMatch of tagMatches) {
    const captured = tagMatch[1];
    if (captured) {
      tags.push(`  {${captured}}`);
    }
  }

  if (tags.length === 0) {
    return block;
  }

  return `{3:\n${tags.join('\n')}\n}`;
}

/**
 * Format Block 4 (Text Block) with aligned field tags and values
 */
function formatBlock4(block: string): string {
  // Extract content between {4: and -}
  const match = block.match(/^\{4:\s*([\s\S]*?)-\}$/);
  if (!match) return block;

  const content = match[1];
  if (!content) return block;

  const lines: string[] = ['{4:'];
  const trimmedContent = content.trim();

  // Split into fields (lines starting with :)
  const fieldLines = trimmedContent.split('\n');
  let currentField = '';

  for (const line of fieldLines) {
    if (line.startsWith(':')) {
      // Start of a new field
      if (currentField) {
        lines.push(`  ${currentField}`);
      }
      currentField = line;
    } else if (currentField) {
      // Continuation of the current field
      currentField += '\n' + line;
    }
  }

  // Add the last field
  if (currentField) {
    lines.push(`  ${currentField}`);
  }

  lines.push('-}');
  return lines.join('\n');
}

/**
 * Format Block 5 (Trailer) with nested tags on separate lines
 */
function formatBlock5(block: string): string {
  // Extract content between {5: and }
  const match = block.match(/^\{5:(.+)\}$/s);
  if (!match) return block;

  const content = match[1];
  if (!content) return block;

  const tags: string[] = [];

  // Extract nested tags like {CHK:...}
  const tagMatches = content.matchAll(/\{([^}]+)\}/g);
  for (const tagMatch of tagMatches) {
    const captured = tagMatch[1];
    if (captured) {
      tags.push(`  {${captured}}`);
    }
  }

  if (tags.length === 0) {
    return block;
  }

  return `{5:\n${tags.join('\n')}\n}`;
}

/**
 * Format XML with proper indentation
 *
 * @param xml - Raw XML string
 * @param indent - Number of spaces per indentation level (default: 2)
 * @returns Formatted XML with proper line breaks and indentation
 */
export function formatXml(xml: string, indent = 2): string {
  if (!xml || xml.trim().length === 0) {
    return '';
  }

  const PADDING = ' '.repeat(indent);
  const normalized = xml.replace(/\r\n/g, '\n').trim();

  // Remove existing indentation and line breaks between tags
  const formatted = normalized.replace(/>\s+</g, '><');

  let level = 0;
  const lines: string[] = [];
  let currentTag = '';
  let inText = false;

  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    if (!char) continue;

    const nextChar = i < formatted.length - 1 ? formatted[i + 1] : '';

    if (char === '<') {
      // Save any preceding text content
      if (inText && currentTag.trim()) {
        lines.push(PADDING.repeat(level) + currentTag.trim());
        currentTag = '';
      }
      inText = false;
      currentTag = char;
    } else if (char === '>') {
      currentTag += char;

      // Determine tag type
      const isClosing = currentTag.startsWith('</');
      const isSelfClosing = currentTag.endsWith('/>') || currentTag.startsWith('<?') || currentTag.startsWith('<!');
      const isOpening = !isClosing && !isSelfClosing;

      // Adjust level before closing tags
      if (isClosing) {
        level = Math.max(0, level - 1);
      }

      // Add the tag
      lines.push(PADDING.repeat(level) + currentTag);

      // Adjust level after opening tags
      if (isOpening) {
        level++;
      }

      currentTag = '';

      // Check if next content is text (not a tag)
      if (nextChar && nextChar !== '<') {
        inText = true;
      }
    } else {
      currentTag += char;
    }
  }

  // Add any remaining content
  if (currentTag.trim()) {
    lines.push(PADDING.repeat(level) + currentTag.trim());
  }

  return lines.join('\n');
}

/**
 * Format a JavaScript object as indented JSON
 *
 * @param obj - Object to format
 * @param indent - Number of spaces per indentation level (default: 2)
 * @returns Formatted JSON string
 */
export function formatJson(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}
