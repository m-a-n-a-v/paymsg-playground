import { MessageFormat, MessageType } from '../engine/types';

interface StatusBarProps {
  messageFormat?: MessageFormat | undefined;
  messageType?: MessageType | undefined;
}

function formatMessageType(type: MessageType | undefined): string {
  if (!type) return 'Unknown';

  const typeMap: Record<MessageType, string> = {
    [MessageType.MT103]: 'MT103 - Customer Credit Transfer',
    [MessageType.MT202]: 'MT202 - FI Credit Transfer',
    [MessageType.MT940]: 'MT940 - Customer Statement',
    [MessageType.MT942]: 'MT942 - Interim Transaction Report',
    [MessageType.PACS008]: 'pacs.008 - Customer Credit Transfer',
    [MessageType.PACS009]: 'pacs.009 - FI Credit Transfer',
    [MessageType.CAMT053]: 'camt.053 - Bank-to-Customer Statement',
    [MessageType.CAMT052]: 'camt.052 - Interim Report',
    [MessageType.UNKNOWN]: 'Unknown',
  };

  return typeMap[type] || 'Unknown';
}

function formatMessageFormat(format: MessageFormat | undefined): string {
  if (!format || format === MessageFormat.UNKNOWN) return 'No message';
  if (format === MessageFormat.MT) return 'SWIFT MT';
  return 'ISO 20022 MX';
}

export default function StatusBar({ messageFormat, messageType }: StatusBarProps) {
  const formatText = formatMessageFormat(messageFormat);
  const typeText = formatMessageType(messageType);

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-2">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Format:</span>
          <span className="text-zinc-300 font-medium">{formatText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Type:</span>
          <span className="text-zinc-300 font-medium">{typeText}</span>
        </div>
      </div>
    </div>
  );
}
