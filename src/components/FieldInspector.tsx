import { useState, useEffect, type JSX } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ParsedMessage, MtMessage, MxMessage, isMtMessage, isMxMessage, MessageType } from '../engine/types';
import { loadMtSpec, type MtSpec } from '../specs/loader';

interface FieldInspectorProps {
  parsedMessage: ParsedMessage | null | undefined;
  messageType: MessageType;
}

interface MtFieldInfo {
  tag: string;
  name: string;
  value: string;
  subfields?: Record<string, string> | undefined;
}

interface MxElementInfo {
  name: string;
  value: string;
  children: MxElementInfo[];
  attributes: Record<string, string>;
}

export function FieldInspector({ parsedMessage, messageType }: FieldInspectorProps) {
  const [mtSpec, setMtSpec] = useState<MtSpec | null>(null);
  const [expandedMtFields, setExpandedMtFields] = useState<Set<string>>(new Set());
  const [expandedMxElements, setExpandedMxElements] = useState<Set<string>>(new Set());

  // Load MT spec when message type changes
  useEffect(() => {
    if (parsedMessage && isMtMessage(parsedMessage)) {
      const mtType = messageType.toLowerCase() as 'mt103' | 'mt202' | 'mt940' | 'mt942';
      void loadMtSpec(mtType).then((spec) => {
        setMtSpec(spec);
      }).catch(() => {
        setMtSpec(null);
      });
    }
  }, [parsedMessage, messageType]);

  const getFieldName = (tag: string): string => {
    if (!mtSpec?.fields) return tag;
    const field = mtSpec.fields.find((f) => f.tag === tag);
    return field?.name ?? tag;
  };

  const toggleMtField = (tag: string) => {
    setExpandedMtFields((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const toggleMxElement = (path: string) => {
    setExpandedMxElements((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderMtFields = (message: MtMessage): JSX.Element => {
    const fields: MtFieldInfo[] = [];

    // Extract all fields from Block 4
    if (message.block4?.fields) {
      for (const field of message.block4.fields) {
        fields.push({
          tag: field.tag,
          name: getFieldName(field.tag),
          value: field.value,
          subfields: field.subfields,
        });
      }
    }

    if (fields.length === 0) {
      return (
        <div className="p-4 text-zinc-500">
          No fields to display. Parse a message first.
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {fields.map((field, index) => {
          const hasSubfields = field.subfields && Object.keys(field.subfields).length > 0;
          const isExpanded = expandedMtFields.has(field.tag + index.toString());
          const fieldKey = field.tag + index.toString();

          return (
            <div key={fieldKey} className="border-b border-zinc-800 last:border-b-0">
              <button
                onClick={() => {
                  if (hasSubfields) {
                    toggleMtField(fieldKey);
                  }
                }}
                className="w-full text-left p-3 hover:bg-zinc-900 transition-colors"
                disabled={!hasSubfields}
              >
                <div className="flex items-start gap-2">
                  {hasSubfields ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-cyan-400 font-medium">:{field.tag}:</span>
                      <span className="text-zinc-300 text-sm">{field.name}</span>
                    </div>
                    {!hasSubfields && (
                      <div className="mt-1 text-sm text-zinc-400 font-mono break-all">
                        {field.value}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {hasSubfields && isExpanded && (
                <div className="bg-zinc-950 border-t border-zinc-800">
                  <div className="p-3 pl-9 space-y-2">
                    <div className="text-sm text-zinc-400 font-mono break-all mb-2">
                      <span className="text-zinc-500">Raw:</span> {field.value}
                    </div>
                    {Object.entries(field.subfields ?? {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-purple-400 text-sm font-medium min-w-[100px]">
                          {key}:
                        </span>
                        <span className="text-zinc-300 text-sm font-mono break-all">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const buildElementTree = (element: Element, path = ''): MxElementInfo => {
    const currentPath = path ? `${path}/${element.localName}` : element.localName;
    const children: MxElementInfo[] = [];
    const attributes: Record<string, string> = {};

    // Extract attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes.item(i);
      if (attr) {
        attributes[attr.name] = attr.value;
      }
    }

    // Get text content (only direct text, not from children)
    let textContent = '';
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      if (node?.nodeType === Node.TEXT_NODE) {
        textContent += node.textContent ?? '';
      }
    }
    textContent = textContent.trim();

    // Process child elements
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children.item(i);
      if (child) {
        children.push(buildElementTree(child, currentPath));
      }
    }

    return {
      name: element.localName,
      value: textContent,
      children,
      attributes,
    };
  };

  const renderMxElement = (
    element: MxElementInfo,
    path: string,
    depth = 0
  ): JSX.Element => {
    const hasChildren = element.children.length > 0;
    const hasValue = element.value.length > 0;
    const hasAttributes = Object.keys(element.attributes).length > 0;
    const isExpanded = expandedMxElements.has(path);
    const paddingLeft = depth * 16;

    return (
      <div key={path}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleMxElement(path);
            }
          }}
          className="w-full text-left p-2 hover:bg-zinc-900 transition-colors border-b border-zinc-800"
          style={{ paddingLeft: `${(paddingLeft + 12).toString()}px` }}
          disabled={!hasChildren}
        >
          <div className="flex items-start gap-2">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              )
            ) : (
              <div className="w-4" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-blue-400 font-medium">&lt;{element.name}&gt;</span>
                {hasAttributes && (
                  <span className="text-orange-400 text-xs">
                    {Object.entries(element.attributes)
                      .map(([key, value]) => `${key}="${value}"`)
                      .join(' ')}
                  </span>
                )}
              </div>
              {hasValue && (
                <div className="mt-1 text-sm text-zinc-300 font-mono break-all">
                  {element.value}
                </div>
              )}
            </div>
          </div>
        </button>

        {hasChildren && isExpanded && (
          <div>
            {element.children.map((child, index): JSX.Element => {
              const childPath = `${path}/${child.name}-${index.toString()}`;
              return renderMxElement(child, childPath, depth + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMxTree = (message: MxMessage): JSX.Element => {
    const tree = buildElementTree(message.root);
    return (
      <div>
        {renderMxElement(tree, tree.name, 0)}
      </div>
    );
  };

  if (!parsedMessage) {
    return (
      <div className="p-4 text-center text-zinc-500">
        <p>No message parsed yet.</p>
        <p className="text-sm mt-2">Parse a message to inspect its fields.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {isMtMessage(parsedMessage) ? (
        renderMtFields(parsedMessage)
      ) : isMxMessage(parsedMessage) ? (
        renderMxTree(parsedMessage)
      ) : (
        <div className="p-4 text-zinc-500">Unsupported message format</div>
      )}
    </div>
  );
}
