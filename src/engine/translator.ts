/**
 * Translation engine for MT ↔ MX message conversion
 * Implements field mappings and transformations between SWIFT MT and ISO 20022 MX formats
 */

import type {
  MtMessage,
  MxMessage,
  DataLossWarning,
  TranslationResult,
} from './types';
import { MessageFormat, MessageType, DataLossCategory } from './types';
import { parseMessage } from './parser';
import { loadMapping } from '../specs/loader';

/**
 * Translate a message from one format to another
 * Auto-detects source format and message type
 */
export async function translateMessage(
  sourceMessage: string,
  targetFormat: MessageFormat,
): Promise<TranslationResult> {
  // Parse source message
  const parsed = parseMessage(sourceMessage);

  if ('block1' in parsed) {
    // MT message - translate to MX
    if (targetFormat === MessageFormat.MT) {
      throw new Error('Source and target formats cannot both be MT');
    }
    return translateMtToMx(parsed, sourceMessage);
  } else {
    // MX message - translate to MT
    if (targetFormat === MessageFormat.MX) {
      throw new Error('Source and target formats cannot both be MX');
    }
    return translateMxToMt(parsed, sourceMessage);
  }
}

/**
 * Translate MT103 to pacs.008
 */
async function translateMt103ToPacs008(
  mt: MtMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  const mapping = await loadMapping('mt103_pacs008');

  // Extract MT103 fields
  const fields = new Map<string, string>();
  const block3Tags = new Map<string, string>();

  for (const field of mt.block4?.fields || []) {
    fields.set(field.tag, field.value);
  }

  // Parse Block 3 tags if present
  if (mt.block3?.tags) {
    for (const [tag, value] of Object.entries(mt.block3.tags)) {
      block3Tags.set(tag, value);
    }
  }

  // Helper: Get field value
  const getField = (tag: string): string | undefined => fields.get(tag);

  // Helper: Convert MT date (YYMMDD) to ISO date (YYYY-MM-DD)
  const convertMtDate = (mtDate: string): string => {
    const yy = parseInt(mtDate.substring(0, 2), 10);
    const mm = mtDate.substring(2, 4);
    const dd = mtDate.substring(4, 6);
    const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
    return `${String(yyyy)}-${mm}-${dd}`;
  };

  // Helper: Convert MT amount (comma decimal) to MX amount (period decimal)
  const convertMtAmount = (mtAmount: string): string => {
    return mtAmount.replace(',', '.');
  };

  // Helper: Parse field 32A (Date, Currency, Amount)
  const field32A = getField('32A');
  let settlementDate = '';
  let settlementCurrency = '';
  let settlementAmount = '';

  if (field32A && field32A.length >= 15) {
    settlementDate = convertMtDate(field32A.substring(0, 6));
    settlementCurrency = field32A.substring(6, 9);
    settlementAmount = convertMtAmount(field32A.substring(9));
  }

  // Helper: Parse field 50K (Ordering Customer)
  const field50K = getField('50K');
  let debtorAccount = '';
  let debtorName = '';
  const debtorAddressLines: string[] = [];

  if (field50K) {
    const lines = field50K.split('\n').filter((l) => l.trim());
    let nameStartIndex = 0;

    // Check if first line is account (starts with /)
    const firstLine = lines[0];
    if (firstLine && firstLine.startsWith('/')) {
      debtorAccount = firstLine.substring(1); // Remove leading /
      nameStartIndex = 1;
    }

    // Next line is name
    const nameLine = lines[nameStartIndex];
    if (nameLine) {
      debtorName = nameLine;
    }

    // Remaining lines are address
    for (let i = nameStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line) {
        debtorAddressLines.push(line);
      }
    }
  }

  // Helper: Parse field 59 (Beneficiary Customer)
  const field59 = getField('59');
  let creditorAccount = '';
  let creditorName = '';
  const creditorAddressLines: string[] = [];

  if (field59) {
    const lines = field59.split('\n').filter((l) => l.trim());
    let nameStartIndex = 0;

    // Check if first line is account (starts with /)
    const firstLine = lines[0];
    if (firstLine && firstLine.startsWith('/')) {
      creditorAccount = firstLine.substring(1); // Remove leading /
      nameStartIndex = 1;
    }

    // Next line is name
    const nameLine = lines[nameStartIndex];
    if (nameLine) {
      creditorName = nameLine;
    }

    // Remaining lines are address
    for (let i = nameStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line) {
        creditorAddressLines.push(line);
      }
    }
  }

  // Helper: Check if account is IBAN format
  const isIban = (account: string): boolean => {
    // Basic IBAN check: 2 letter country code + 2 digit check + alphanumeric
    return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(account);
  };

  // Helper: Parse field 71A (Charge Bearer)
  const field71A = getField('71A');
  let chargeBearerCode = 'SHAR'; // Default to shared
  if (field71A) {
    const lookupTable: Record<string, string> = {
      BEN: 'CRED',
      OUR: 'DEBT',
      SHA: 'SHAR',
    };
    chargeBearerCode = lookupTable[field71A] || 'SHAR';
  }

  // Helper: Get BIC from field 52A (Debtor Agent)
  const field52A = getField('52A');
  let debtorAgentBic = '';
  if (field52A) {
    // Field 52A format: optional account line, then BIC
    const lines = field52A.split('\n').filter((l) => l.trim());
    const lastLine = lines[lines.length - 1];
    debtorAgentBic = lastLine || '';
  }

  // Helper: Get BIC from field 57A (Creditor Agent)
  const field57A = getField('57A');
  let creditorAgentBic = '';
  if (field57A) {
    // Field 57A format: optional account line, then BIC
    const lines = field57A.split('\n').filter((l) => l.trim());
    const lastLine = lines[lines.length - 1];
    creditorAgentBic = lastLine || '';
  }

  // Helper: Get field 20 (Transaction Reference)
  const field20 = getField('20') || '';

  // Helper: Get UETR from Block 3 tag 121
  const uetr = block3Tags.get('121') || '';

  // Helper: Get field 23B (Bank Operation Code)
  const field23B = getField('23B') || '';

  // Helper: Get field 70 (Remittance Information)
  const field70 = getField('70');
  let remittanceInfo = '';
  if (field70) {
    // Concatenate lines with space
    remittanceInfo = field70.split('\n').filter((l) => l.trim()).join(' ');
  }

  // Generate MsgId and CreDtTm
  const msgId = `MT103-${field20}-${String(Date.now())}`;
  const creationDateTime = new Date().toISOString();

  // Build pacs.008 XML
  const namespace = 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<Document xmlns="${namespace}">\n`;
  xml += '  <FIToFICstmrCdtTrf>\n';

  // Group Header
  xml += '    <GrpHdr>\n';
  xml += `      <MsgId>${escapeXml(msgId)}</MsgId>\n`;
  xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;
  xml += '      <NbOfTxs>1</NbOfTxs>\n';
  if (settlementAmount) {
    xml += `      <CtrlSum>${settlementAmount}</CtrlSum>\n`;
  }
  xml += '    </GrpHdr>\n';

  // Credit Transfer Transaction Information
  xml += '    <CdtTrfTxInf>\n';

  // Payment Identification
  xml += '      <PmtId>\n';
  if (field20) {
    xml += `        <InstrId>${escapeXml(field20)}</InstrId>\n`;
  }
  // EndToEndId: use UETR if present, otherwise field 20
  const endToEndId = uetr || field20 || 'NOTPROVIDED';
  xml += `        <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>\n`;
  if (uetr) {
    xml += `        <UETR>${escapeXml(uetr)}</UETR>\n`;
  }
  xml += '      </PmtId>\n';

  // Payment Type Information
  if (field23B) {
    xml += '      <PmtTpInf>\n';
    xml += '        <LclInstrm>\n';
    xml += `          <Prtry>${escapeXml(field23B)}</Prtry>\n`;
    xml += '        </LclInstrm>\n';
    xml += '      </PmtTpInf>\n';
  }

  // Interbank Settlement Date and Amount
  if (settlementDate) {
    xml += `      <IntrBkSttlmDt>${settlementDate}</IntrBkSttlmDt>\n`;
  }
  if (settlementAmount && settlementCurrency) {
    xml += `      <IntrBkSttlmAmt Ccy="${settlementCurrency}">${settlementAmount}</IntrBkSttlmAmt>\n`;
  }

  // Charge Bearer
  xml += `      <ChrgBr>${chargeBearerCode}</ChrgBr>\n`;

  // Debtor Agent (Field 52A)
  if (debtorAgentBic) {
    xml += '      <DbtrAgt>\n';
    xml += '        <FinInstnId>\n';
    xml += `          <BICFI>${escapeXml(debtorAgentBic)}</BICFI>\n`;
    xml += '        </FinInstnId>\n';
    xml += '      </DbtrAgt>\n';
  }

  // Debtor (Field 50K)
  if (debtorName) {
    xml += '      <Dbtr>\n';
    xml += `        <Nm>${escapeXml(debtorName)}</Nm>\n`;
    if (debtorAddressLines.length > 0) {
      xml += '        <PstlAdr>\n';
      for (const line of debtorAddressLines) {
        xml += `          <AdrLine>${escapeXml(line)}</AdrLine>\n`;
      }
      xml += '        </PstlAdr>\n';
    }
    xml += '      </Dbtr>\n';
  }

  // Debtor Account (from Field 50K)
  if (debtorAccount) {
    xml += '      <DbtrAcct>\n';
    xml += '        <Id>\n';
    if (isIban(debtorAccount)) {
      xml += `          <IBAN>${escapeXml(debtorAccount)}</IBAN>\n`;
    } else {
      xml += '          <Othr>\n';
      xml += `            <Id>${escapeXml(debtorAccount)}</Id>\n`;
      xml += '          </Othr>\n';
    }
    xml += '        </Id>\n';
    xml += '      </DbtrAcct>\n';
  }

  // Creditor Agent (Field 57A)
  if (creditorAgentBic) {
    xml += '      <CdtrAgt>\n';
    xml += '        <FinInstnId>\n';
    xml += `          <BICFI>${escapeXml(creditorAgentBic)}</BICFI>\n`;
    xml += '        </FinInstnId>\n';
    xml += '      </CdtrAgt>\n';
  }

  // Creditor (Field 59)
  if (creditorName) {
    xml += '      <Cdtr>\n';
    xml += `        <Nm>${escapeXml(creditorName)}</Nm>\n`;
    if (creditorAddressLines.length > 0) {
      xml += '        <PstlAdr>\n';
      for (const line of creditorAddressLines) {
        xml += `          <AdrLine>${escapeXml(line)}</AdrLine>\n`;
      }
      xml += '        </PstlAdr>\n';
    }
    xml += '      </Cdtr>\n';
  }

  // Creditor Account (from Field 59)
  if (creditorAccount) {
    xml += '      <CdtrAcct>\n';
    xml += '        <Id>\n';
    if (isIban(creditorAccount)) {
      xml += `          <IBAN>${escapeXml(creditorAccount)}</IBAN>\n`;
    } else {
      xml += '          <Othr>\n';
      xml += `            <Id>${escapeXml(creditorAccount)}</Id>\n`;
      xml += '          </Othr>\n';
    }
    xml += '        </Id>\n';
    xml += '      </CdtrAcct>\n';
  }

  // Remittance Information (Field 70)
  if (remittanceInfo) {
    xml += '      <RmtInf>\n';
    xml += `        <Ustrd>${escapeXml(remittanceInfo)}</Ustrd>\n`;
    xml += '      </RmtInf>\n';
  }

  xml += '    </CdtTrfTxInf>\n';
  xml += '  </FIToFICstmrCdtTrf>\n';
  xml += '</Document>';

  // Check for data loss scenarios
  if (field20 && field20.length > 35) {
    warnings.push({
      field_path: 'PmtId/InstrId',
      category: DataLossCategory.TRUNCATION,
      description: `MT field 20 value truncated from ${String(field20.length)} to 35 characters (pacs.008 limit)`,
    });
  }

  // Check for MT-only fields that don't map
  const mtOnlyFields = mapping.mt_only_fields || [];
  for (const mtOnly of mtOnlyFields) {
    if (getField(mtOnly.mt_tag)) {
      warnings.push({
        field_path: `MT ${mtOnly.mt_tag}`,
        category: DataLossCategory.NO_EQUIVALENT,
        description: `${mtOnly.mt_field_name}: ${mtOnly.reason}`,
      });
    }
  }

  return {
    translatedMessage: xml,
    sourceFormat: MessageFormat.MT,
    targetFormat: MessageFormat.MX,
    sourceType: MessageType.MT103,
    targetType: MessageType.PACS008,
    warnings,
  };
}

/**
 * Translate pacs.008 to MT103
 */
async function translatePacs008ToMt103(
  mx: MxMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  await loadMapping('mt103_pacs008');

  // Helper: Get element text by path
  const getElement = (path: string): string => {
    // Navigate XML path
    const parts = path.split('/');
    let current: Element | null = mx.root;

    for (const part of parts) {
      if (!current) break;

      // Find child element with matching localName
      let found: Element | null = null;
      for (let i = 0; i < current.children.length; i++) {
        const child = current.children[i] as Element;
        if (child.localName === part) {
          found = child;
          break;
        }
      }

      current = found;
    }

    if (!current) return '';
    const text = current.textContent;
    return text ? text.trim() : '';
  };

  // Helper: Get all elements matching path (for repeated elements)
  const getElements = (path: string): Element[] => {
    const parts = path.split('/');
    let currentList: Element[] = [mx.root];

    for (const part of parts) {
      const nextList: Element[] = [];

      for (const current of currentList) {
        for (let i = 0; i < current.children.length; i++) {
          const child = current.children[i] as Element;
          if (child.localName === part) {
            nextList.push(child);
          }
        }
      }

      currentList = nextList;
    }

    return currentList;
  };

  // Helper: Convert MX date (YYYY-MM-DD) to MT date (YYMMDD)
  const convertMxDate = (mxDate: string): string => {
    // Extract YYYY-MM-DD
    const match = /(\d{4})-(\d{2})-(\d{2})/.exec(mxDate);
    if (!match || !match[1] || !match[2] || !match[3]) return '';

    const yyyy = match[1];
    const mm = match[2];
    const dd = match[3];
    const yy = yyyy.substring(2, 4);

    return `${yy}${mm}${dd}`;
  };

  // Helper: Convert MX amount (period decimal) to MT amount (comma decimal)
  const convertMxAmount = (mxAmount: string): string => {
    return mxAmount.replace('.', ',');
  };

  // Extract pacs.008 fields
  const msgId = getElement('FIToFICstmrCdtTrf/GrpHdr/MsgId');
  const cdtrTxInfo = 'FIToFICstmrCdtTrf/CdtTrfTxInf';

  // Payment Identification
  const instrId = getElement(`${cdtrTxInfo}/PmtId/InstrId`);
  const endToEndId = getElement(`${cdtrTxInfo}/PmtId/EndToEndId`);
  const uetr = getElement(`${cdtrTxInfo}/PmtId/UETR`);

  // Amount and Date
  const settlementDateMx = getElement(`${cdtrTxInfo}/IntrBkSttlmDt`);
  const settlementDate = convertMxDate(settlementDateMx);

  const amountElements = getElements(`${cdtrTxInfo}/IntrBkSttlmAmt`);
  let settlementCurrency = '';
  let settlementAmount = '';
  const firstAmountElement = amountElements[0];
  if (firstAmountElement) {
    settlementCurrency = firstAmountElement.getAttribute('Ccy') || '';
    const textContent = firstAmountElement.textContent;
    settlementAmount = convertMxAmount(textContent ? textContent.trim() : '');
  }

  // Charge Bearer
  const chrgBr = getElement(`${cdtrTxInfo}/ChrgBr`);
  let chargeBearerCode = 'SHA'; // Default
  const reverseLookup: Record<string, string> = {
    CRED: 'BEN',
    DEBT: 'OUR',
    SHAR: 'SHA',
  };
  chargeBearerCode = reverseLookup[chrgBr] || 'SHA';

  // Bank Operation Code
  const bankOpCode = getElement(`${cdtrTxInfo}/PmtTpInf/LclInstrm/Prtry`);

  // Debtor
  const debtorName = getElement(`${cdtrTxInfo}/Dbtr/Nm`);
  const debtorAddressElements = getElements(`${cdtrTxInfo}/Dbtr/PstlAdr/AdrLine`);
  const debtorAddressLines = debtorAddressElements.map((el) => {
    const text = el.textContent;
    return text ? text.trim() : '';
  });

  // Debtor Account
  let debtorAccount = getElement(`${cdtrTxInfo}/DbtrAcct/Id/IBAN`);
  if (!debtorAccount) {
    debtorAccount = getElement(`${cdtrTxInfo}/DbtrAcct/Id/Othr/Id`);
  }

  // Debtor Agent
  const debtorAgentBic = getElement(`${cdtrTxInfo}/DbtrAgt/FinInstnId/BICFI`);

  // Creditor
  const creditorName = getElement(`${cdtrTxInfo}/Cdtr/Nm`);
  const creditorAddressElements = getElements(`${cdtrTxInfo}/Cdtr/PstlAdr/AdrLine`);
  const creditorAddressLines = creditorAddressElements.map((el) => {
    const text = el.textContent;
    return text ? text.trim() : '';
  });

  // Creditor Account
  let creditorAccount = getElement(`${cdtrTxInfo}/CdtrAcct/Id/IBAN`);
  if (!creditorAccount) {
    creditorAccount = getElement(`${cdtrTxInfo}/CdtrAcct/Id/Othr/Id`);
  }

  // Creditor Agent
  const creditorAgentBic = getElement(`${cdtrTxInfo}/CdtrAgt/FinInstnId/BICFI`);

  // Remittance Information
  const remittanceInfo = getElement(`${cdtrTxInfo}/RmtInf/Ustrd`);

  // Build MT103 message
  let mt = '';

  // Block 1 (Basic Header) - Use placeholder values
  mt += '{1:F01BANKBICAXXX0000000000}';

  // Block 2 (Application Header) - Input message
  mt += '{2:I103BANKBICAXXXXN}';

  // Block 3 (User Header) - Optional, include UETR if present
  if (uetr) {
    mt += `{3:{121:${uetr}}}`;
  }

  // Block 4 (Text Block)
  mt += '{4:\n';

  // Field 20: Transaction Reference (use InstrId or truncate if too long)
  let field20Value = instrId || endToEndId || msgId;
  if (field20Value.length > 16) {
    field20Value = field20Value.substring(0, 16);
    warnings.push({
      field_path: 'MT field 20',
      category: DataLossCategory.TRUNCATION,
      description: `Instruction ID truncated from ${String(instrId.length)} to 16 characters (MT103 limit)`,
    });
  }
  mt += `:20:${field20Value}\n`;

  // Field 23B: Bank Operation Code
  mt += `:23B:${bankOpCode || 'CRED'}\n`;

  // Field 32A: Value Date, Currency Code, Amount
  mt += `:32A:${settlementDate}${settlementCurrency}${settlementAmount}\n`;

  // Field 50K: Ordering Customer
  if (debtorName) {
    mt += ':50K:';
    if (debtorAccount) {
      mt += `/${debtorAccount}\n`;
    }
    mt += `${debtorName}\n`;
    for (const line of debtorAddressLines) {
      mt += `${line}\n`;
    }
  }

  // Field 52A: Ordering Institution (if BIC present)
  if (debtorAgentBic) {
    mt += `:52A:${debtorAgentBic}\n`;
  }

  // Field 57A: Account With Institution (Beneficiary's Bank)
  if (creditorAgentBic) {
    mt += `:57A:${creditorAgentBic}\n`;
  }

  // Field 59: Beneficiary Customer
  if (creditorName) {
    mt += ':59:';
    if (creditorAccount) {
      mt += `/${creditorAccount}\n`;
    }
    mt += `${creditorName}\n`;
    for (const line of creditorAddressLines) {
      mt += `${line}\n`;
    }
  }

  // Field 70: Remittance Information
  if (remittanceInfo) {
    mt += `:70:${remittanceInfo}\n`;
  }

  // Field 71A: Details of Charges
  mt += `:71A:${chargeBearerCode}\n`;

  mt += '-}';

  // Block 5 (Trailer) - Empty for now
  mt += '{5:}';

  // Check for MX-only fields that don't map
  if (msgId && msgId.length > 35) {
    warnings.push({
      field_path: 'GrpHdr/MsgId',
      category: 'NoEquivalent' as DataLossCategory,
      description: 'MX GrpHdr/MsgId has no direct MT103 equivalent. Used to derive field 20.',
    });
  }

  return {
    translatedMessage: mt,
    sourceFormat: MessageFormat.MX,
    targetFormat: MessageFormat.MT,
    sourceType: MessageType.PACS008,
    targetType: MessageType.MT103,
    warnings,
  };
}

/**
 * Translate MT to MX format
 */
async function translateMtToMx(
  mt: MtMessage,
  sourceMessage: string,
): Promise<TranslationResult> {
  // Detect MT type from Block 2
  const messageType = mt.block2?.message_type || '';

  switch (messageType) {
    case '103':
      return translateMt103ToPacs008(mt, sourceMessage);
    default:
      throw new Error(`Translation from MT${messageType} to MX not yet supported`);
  }
}

/**
 * Translate MX to MT format
 */
async function translateMxToMt(
  mx: MxMessage,
  sourceMessage: string,
): Promise<TranslationResult> {
  // Detect MX type from namespace
  const namespace = mx.namespace || '';

  if (namespace.includes('pacs.008')) {
    return translatePacs008ToMt103(mx, sourceMessage);
  } else {
    throw new Error(`Translation from ${namespace} to MT not yet supported`);
  }
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
