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
  } else if ('namespace' in parsed) {
    // MX message - translate to MT
    if (targetFormat === MessageFormat.MX) {
      throw new Error('Source and target formats cannot both be MX');
    }
    return translateMxToMt(parsed, sourceMessage);
  } else {
    throw new Error('Unable to detect message format');
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
 * Translate MT202 to pacs.009
 */
async function translateMt202ToPacs009(
  mt: MtMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  const mapping = await loadMapping('mt202_pacs009');

  // Extract MT202 fields
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

  // Helper: Get field 20 (Transaction Reference)
  const field20 = getField('20') || '';

  // Helper: Get field 21 (Related Reference)
  const field21 = getField('21') || '';

  // Helper: Get UETR from Block 3 tag 121
  const uetr = block3Tags.get('121') || '';

  // Helper: Get BIC from field 52A (Ordering Institution)
  const field52A = getField('52A');
  let instgAgtBic = '';
  if (field52A) {
    const lines = field52A.split('\n').filter((l) => l.trim());
    const lastLine = lines[lines.length - 1];
    instgAgtBic = lastLine || '';
  }

  // Helper: Get BIC from field 56A (Intermediary Institution)
  const field56A = getField('56A');
  let intermyAgt1Bic = '';
  let intermyAgt1Account = '';
  if (field56A) {
    const lines = field56A.split('\n').filter((l) => l.trim());
    const firstLine = lines[0];
    if (firstLine && firstLine.startsWith('/')) {
      intermyAgt1Account = firstLine.substring(1);
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        intermyAgt1Bic = lastLine || '';
      }
    } else {
      const lastLine = lines[lines.length - 1];
      intermyAgt1Bic = lastLine || '';
    }
  }

  // Helper: Get BIC from field 57A (Account With Institution)
  const field57A = getField('57A');
  let cdtrAgtBic = '';
  let cdtrAgtAccount = '';
  if (field57A) {
    const lines = field57A.split('\n').filter((l) => l.trim());
    const firstLine = lines[0];
    if (firstLine && firstLine.startsWith('/')) {
      cdtrAgtAccount = firstLine.substring(1);
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        cdtrAgtBic = lastLine || '';
      }
    } else {
      const lastLine = lines[lines.length - 1];
      cdtrAgtBic = lastLine || '';
    }
  }

  // Helper: Get BIC from field 58A (Beneficiary Institution)
  const field58A = getField('58A');
  let cdtrBic = '';
  let cdtrAccount = '';
  if (field58A) {
    const lines = field58A.split('\n').filter((l) => l.trim());
    const firstLine = lines[0];
    if (firstLine && firstLine.startsWith('/')) {
      cdtrAccount = firstLine.substring(1);
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        cdtrBic = lastLine || '';
      }
    } else {
      const lastLine = lines[lines.length - 1];
      cdtrBic = lastLine || '';
    }
  }

  // Helper: Get field 72 (Sender to Receiver Information)
  const field72 = getField('72');
  let instrInfo = '';
  if (field72) {
    instrInfo = field72.split('\n').filter((l) => l.trim()).join(' ');
  }

  // Generate MsgId and CreDtTm
  const msgId = `MT202-${field20}-${String(Date.now())}`;
  const creationDateTime = new Date().toISOString();

  // Build pacs.009 XML
  const namespace = 'urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<Document xmlns="${namespace}">\n`;
  xml += '  <FICdtTrf>\n';

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
  // EndToEndId: use UETR if present, otherwise field 21 (Related Reference) or field 20
  const endToEndId = uetr || field21 || field20 || 'NOTPROVIDED';
  xml += `        <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>\n`;
  if (uetr) {
    xml += `        <UETR>${escapeXml(uetr)}</UETR>\n`;
  }
  xml += '      </PmtId>\n';

  // Interbank Settlement Date and Amount
  if (settlementDate) {
    xml += `      <IntrBkSttlmDt>${settlementDate}</IntrBkSttlmDt>\n`;
  }
  if (settlementAmount && settlementCurrency) {
    xml += `      <IntrBkSttlmAmt Ccy="${settlementCurrency}">${settlementAmount}</IntrBkSttlmAmt>\n`;
  }

  // Charge Bearer - Default to SHAR (MT202 has no charge bearer field)
  xml += '      <ChrgBr>SHAR</ChrgBr>\n';

  // Instructing Agent (Field 52A)
  if (instgAgtBic) {
    xml += '      <InstgAgt>\n';
    xml += '        <FinInstnId>\n';
    xml += `          <BICFI>${escapeXml(instgAgtBic)}</BICFI>\n`;
    xml += '        </FinInstnId>\n';
    xml += '      </InstgAgt>\n';
  }

  // Intermediary Agent 1 (Field 56A)
  if (intermyAgt1Bic) {
    xml += '      <IntrmyAgt1>\n';
    xml += '        <FinInstnId>\n';
    xml += `          <BICFI>${escapeXml(intermyAgt1Bic)}</BICFI>\n`;
    xml += '        </FinInstnId>\n';
    xml += '      </IntrmyAgt1>\n';
  }
  // Intermediary Agent 1 Account
  if (intermyAgt1Account) {
    xml += '      <IntrmyAgt1Acct>\n';
    xml += '        <Id>\n';
    xml += '          <Othr>\n';
    xml += `            <Id>${escapeXml(intermyAgt1Account)}</Id>\n`;
    xml += '          </Othr>\n';
    xml += '        </Id>\n';
    xml += '      </IntrmyAgt1Acct>\n';
  }

  // Creditor Agent (Field 57A)
  if (cdtrAgtBic) {
    xml += '      <CdtrAgt>\n';
    xml += '        <FinInstnId>\n';
    xml += `          <BICFI>${escapeXml(cdtrAgtBic)}</BICFI>\n`;
    xml += '        </FinInstnId>\n';
    xml += '      </CdtrAgt>\n';
  }
  // Creditor Agent Account
  if (cdtrAgtAccount) {
    xml += '      <CdtrAgtAcct>\n';
    xml += '        <Id>\n';
    xml += '          <Othr>\n';
    xml += `            <Id>${escapeXml(cdtrAgtAccount)}</Id>\n`;
    xml += '          </Othr>\n';
    xml += '        </Id>\n';
    xml += '      </CdtrAgtAcct>\n';
  }

  // Creditor (Field 58A - beneficiary institution)
  if (cdtrBic) {
    xml += '      <Cdtr>\n';
    xml += '        <Id>\n';
    xml += '          <OrgId>\n';
    xml += `            <AnyBIC>${escapeXml(cdtrBic)}</AnyBIC>\n`;
    xml += '          </OrgId>\n';
    xml += '        </Id>\n';
    xml += '      </Cdtr>\n';
  }
  // Creditor Account (from Field 58A)
  if (cdtrAccount) {
    xml += '      <CdtrAcct>\n';
    xml += '        <Id>\n';
    xml += '          <Othr>\n';
    xml += `            <Id>${escapeXml(cdtrAccount)}</Id>\n`;
    xml += '          </Othr>\n';
    xml += '        </Id>\n';
    xml += '      </CdtrAcct>\n';
  }

  // Instruction for Next Agent (Field 72)
  if (instrInfo) {
    xml += '      <InstrForNxtAgt>\n';
    xml += `        <InstrInf>${escapeXml(instrInfo.substring(0, 140))}</InstrInf>\n`;
    xml += '      </InstrForNxtAgt>\n';
    if (instrInfo.length > 140) {
      warnings.push({
        field_path: 'InstrForNxtAgt/InstrInf',
        category: DataLossCategory.TRUNCATION,
        description: `Field 72 content truncated from ${String(instrInfo.length)} to 140 characters`,
      });
    }
  }

  xml += '    </CdtTrfTxInf>\n';
  xml += '  </FICdtTrf>\n';
  xml += '</Document>';

  // Check for MT-only fields
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
    sourceType: MessageType.MT202,
    targetType: MessageType.PACS009,
    warnings,
  };
}

/**
 * Translate pacs.009 to MT202
 */
async function translatePacs009ToMt202(
  mx: MxMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  await loadMapping('mt202_pacs009');

  // Helper: Get element text by path
  const getElement = (path: string): string => {
    const parts = path.split('/');
    let current: Element | null = mx.root;

    for (const part of parts) {
      if (!current) break;

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

  // Helper: Convert MX date (YYYY-MM-DD) to MT date (YYMMDD)
  const convertMxDate = (mxDate: string): string => {
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

  // Extract pacs.009 fields
  const cdtrTxInfo = 'FICdtTrf/CdtTrfTxInf';

  // Payment Identification
  const instrId = getElement(`${cdtrTxInfo}/PmtId/InstrId`);
  const endToEndId = getElement(`${cdtrTxInfo}/PmtId/EndToEndId`);
  const uetr = getElement(`${cdtrTxInfo}/PmtId/UETR`);

  // Amount and Date
  const settlementDateMx = getElement(`${cdtrTxInfo}/IntrBkSttlmDt`);
  const settlementDate = convertMxDate(settlementDateMx);

  // Get amount with currency
  const parts = `${cdtrTxInfo}/IntrBkSttlmAmt`.split('/');
  let current: Element | null = mx.root;
  for (const part of parts) {
    if (!current) break;
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

  let settlementCurrency = '';
  let settlementAmount = '';
  if (current) {
    settlementCurrency = current.getAttribute('Ccy') || '';
    const textContent = current.textContent;
    settlementAmount = convertMxAmount(textContent ? textContent.trim() : '');
  }

  // Instructing Agent
  const instgAgtBic = getElement(`${cdtrTxInfo}/InstgAgt/FinInstnId/BICFI`);

  // Intermediary Agent
  const intermyAgt1Bic = getElement(`${cdtrTxInfo}/IntrmyAgt1/FinInstnId/BICFI`);
  const intermyAgt1Account = getElement(`${cdtrTxInfo}/IntrmyAgt1Acct/Id/Othr/Id`);

  // Creditor Agent
  const cdtrAgtBic = getElement(`${cdtrTxInfo}/CdtrAgt/FinInstnId/BICFI`);
  const cdtrAgtAccount = getElement(`${cdtrTxInfo}/CdtrAgtAcct/Id/Othr/Id`);

  // Creditor
  const cdtrBic = getElement(`${cdtrTxInfo}/Cdtr/Id/OrgId/AnyBIC`);
  const cdtrAccount = getElement(`${cdtrTxInfo}/CdtrAcct/Id/Othr/Id`);

  // Instruction for Next Agent
  const instrInfo = getElement(`${cdtrTxInfo}/InstrForNxtAgt/InstrInf`);

  // Build MT202 message
  let mt = '';

  // Block 1 (Basic Header) - Use placeholder values
  mt += '{1:F01BANKBICAXXX0000000000}';

  // Block 2 (Application Header) - Input message
  mt += '{2:I202BANKBICAXXXXN}';

  // Block 3 (User Header) - Optional, include UETR if present
  if (uetr) {
    mt += `{3:{121:${uetr}}}`;
  }

  // Block 4 (Text Block)
  mt += '{4:\n';

  // Field 20: Transaction Reference (use InstrId or truncate if too long)
  let field20Value = instrId || endToEndId;
  if (field20Value.length > 16) {
    field20Value = field20Value.substring(0, 16);
    warnings.push({
      field_path: 'MT field 20',
      category: DataLossCategory.TRUNCATION,
      description: `Instruction ID truncated from ${String(instrId.length)} to 16 characters (MT202 limit)`,
    });
  }
  mt += `:20:${field20Value}\n`;

  // Field 21: Related Reference (use EndToEndId if different from InstrId)
  if (endToEndId && endToEndId !== instrId && endToEndId !== uetr) {
    let field21Value = endToEndId;
    if (field21Value.length > 16) {
      field21Value = field21Value.substring(0, 16);
    }
    mt += `:21:${field21Value}\n`;
  }

  // Field 32A: Value Date, Currency Code, Amount
  mt += `:32A:${settlementDate}${settlementCurrency}${settlementAmount}\n`;

  // Field 52A: Ordering Institution (if BIC present)
  if (instgAgtBic) {
    mt += `:52A:${instgAgtBic}\n`;
  }

  // Field 56A: Intermediary Institution (if BIC present)
  if (intermyAgt1Bic) {
    mt += ':56A:';
    if (intermyAgt1Account) {
      mt += `/${intermyAgt1Account}\n`;
    }
    mt += `${intermyAgt1Bic}\n`;
  }

  // Field 57A: Account With Institution
  if (cdtrAgtBic) {
    mt += ':57A:';
    if (cdtrAgtAccount) {
      mt += `/${cdtrAgtAccount}\n`;
    }
    mt += `${cdtrAgtBic}\n`;
  }

  // Field 58A: Beneficiary Institution
  if (cdtrBic) {
    mt += ':58A:';
    if (cdtrAccount) {
      mt += `/${cdtrAccount}\n`;
    }
    mt += `${cdtrBic}\n`;
  }

  // Field 72: Sender to Receiver Information
  if (instrInfo) {
    mt += `:72:${instrInfo}\n`;
  }

  mt += '-}';

  // Block 5 (Trailer) - Empty
  mt += '{5:}';

  return {
    translatedMessage: mt,
    sourceFormat: MessageFormat.MX,
    targetFormat: MessageFormat.MT,
    sourceType: MessageType.PACS009,
    targetType: MessageType.MT202,
    warnings,
  };
}

/**
 * Translate MT940 to camt.053
 */
async function translateMt940ToCamt053(
  mt: MtMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  await loadMapping('mt940_camt053');

  // Extract MT940 fields
  const fields = new Map<string, string>();
  const field61Entries: Array<{ tag: string; value: string }> = [];
  const field86Map = new Map<number, string>(); // Map field 61 index to field 86 content

  let field61Index = 0;
  let lastWasField61 = false;

  for (const field of mt.block4?.fields || []) {
    fields.set(field.tag, field.value);

    // Collect all field 61 entries
    if (field.tag === '61') {
      field61Entries.push({ tag: field.tag, value: field.value });
      lastWasField61 = true;
      field61Index++;
    } else if (field.tag === '86' && lastWasField61) {
      // Field 86 follows field 61 - associate with the last field 61
      field86Map.set(field61Index - 1, field.value);
      lastWasField61 = false;
    } else {
      lastWasField61 = false;
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

  // Helper: Parse balance field (60F/60M/62F/62M/64/65)
  const parseBalanceField = (value: string): {
    dcMark: string;
    date: string;
    currency: string;
    amount: string;
  } => {
    const dcMark = value.substring(0, 1); // C or D
    const date = value.substring(1, 7); // YYMMDD
    const currency = value.substring(7, 10); // 3 letter code
    const amount = value.substring(10); // Amount with comma

    return {
      dcMark,
      date: convertMtDate(date),
      currency,
      amount: convertMtAmount(amount),
    };
  };

  // Helper: Parse field 61 (Statement Line)
  const parseField61 = (value: string): {
    valueDate: string;
    entryDate?: string | undefined;
    dcMark: string;
    fundsCode?: string | undefined;
    amount: string;
    txType: string;
    customerRef: string;
    bankRef?: string | undefined;
    supplementary?: string | undefined;
  } => {
    let pos = 0;

    // Value date (YYMMDD)
    const valueDate = value.substring(pos, pos + 6);
    pos += 6;

    // Entry date (MMDD, optional)
    let entryDate: string | undefined;
    const nextChars = value.substring(pos, pos + 4);
    if (nextChars && /^\d{4}$/.test(nextChars)) {
      entryDate = nextChars;
      pos += 4;
    } else if (nextChars && /^\d{2}$/.test(value.substring(pos, pos + 2))) {
      entryDate = value.substring(pos, pos + 2);
      pos += 2;
    }

    // D/C mark (C, D, RC, RD)
    let dcMark = value.substring(pos, pos + 2);
    if (dcMark === 'RC' || dcMark === 'RD') {
      pos += 2;
    } else {
      dcMark = value.substring(pos, pos + 1);
      pos += 1;
    }

    // Funds code (optional, single char)
    let fundsCode: string | undefined;
    const fundsChar = value.substring(pos, pos + 1);
    if (fundsChar && /[A-Z]/.test(fundsChar)) {
      fundsCode = fundsChar;
      pos += 1;
    }

    // Amount (up to 15 digits with comma)
    const amountMatch = /^(\d+,\d+|\d+)/.exec(value.substring(pos));
    let amount = '';
    if (amountMatch && amountMatch[0]) {
      amount = amountMatch[0];
      pos += amountMatch[0].length;
    }

    // Transaction type (4 chars)
    const txType = value.substring(pos, pos + 4);
    pos += 4;

    // Customer reference (up to 16 chars, ends with // or newline)
    let customerRef = '';
    const refMatch = /^([^/\n]+)/.exec(value.substring(pos));
    if (refMatch && refMatch[1]) {
      customerRef = refMatch[1];
      pos += refMatch[1].length;
    }

    // Bank reference (after //, optional)
    let bankRef: string | undefined;
    if (value.substring(pos, pos + 2) === '//') {
      pos += 2;
      const bankRefMatch = /^([^\n]+)/.exec(value.substring(pos));
      if (bankRefMatch && bankRefMatch[1]) {
        bankRef = bankRefMatch[1];
        pos += bankRefMatch[1].length;
      }
    }

    // Supplementary details (on next line, optional)
    let supplementary: string | undefined;
    if (value.substring(pos, pos + 1) === '\n' && pos + 1 < value.length) {
      supplementary = value.substring(pos + 1);
    }

    return {
      valueDate: convertMtDate(valueDate),
      entryDate,
      dcMark,
      fundsCode,
      amount: convertMtAmount(amount),
      txType,
      customerRef,
      bankRef,
      supplementary,
    };
  };

  // Get statement reference (field 20)
  const stmtId = getField('20') || 'NOTPROVIDED';

  // Get account (field 25)
  const account = getField('25') || '';

  // Check if IBAN
  const isIban = (acct: string): boolean => {
    return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(acct);
  };

  // Get statement number (field 28C)
  const field28C = getField('28C') || '';
  const stmtNbMatch = /^(\d+)/.exec(field28C);
  const stmtNb = stmtNbMatch && stmtNbMatch[1] ? stmtNbMatch[1] : '1';

  // Parse balances
  const openingBalance = getField('60F') || getField('60M');
  const closingBalance = getField('62F') || getField('62M');

  if (!openingBalance || !closingBalance) {
    throw new Error('MT940 must have opening (60F/60M) and closing (62F/62M) balances');
  }

  const opBal = parseBalanceField(openingBalance);
  const clBal = parseBalanceField(closingBalance);

  const statementCurrency = opBal.currency;

  // Generate MsgId and CreDtTm
  const msgId = `MT940-${stmtId}-${String(Date.now())}`;
  const creationDateTime = new Date().toISOString();

  // Build camt.053 XML
  const namespace = 'urn:iso:std:iso:20022:tech:xsd:camt.053.001.10';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<Document xmlns="${namespace}">\n`;
  xml += '  <BkToCstmrStmt>\n';

  // Group Header
  xml += '    <GrpHdr>\n';
  xml += `      <MsgId>${escapeXml(msgId)}</MsgId>\n`;
  xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;
  xml += '    </GrpHdr>\n';

  // Statement
  xml += '    <Stmt>\n';
  xml += `      <Id>${escapeXml(stmtId)}</Id>\n`;
  xml += `      <LglSeqNb>${stmtNb}</LglSeqNb>\n`;
  xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;

  // Account
  xml += '      <Acct>\n';
  xml += '        <Id>\n';
  if (isIban(account)) {
    xml += `          <IBAN>${escapeXml(account)}</IBAN>\n`;
  } else {
    xml += '          <Othr>\n';
    xml += `            <Id>${escapeXml(account)}</Id>\n`;
    xml += '          </Othr>\n';
  }
  xml += '        </Id>\n';
  xml += `        <Ccy>${statementCurrency}</Ccy>\n`;
  xml += '      </Acct>\n';

  // Opening Balance
  xml += '      <Bal>\n';
  xml += '        <Tp>\n';
  xml += '          <CdOrPrtry>\n';
  xml += '            <Cd>OPBD</Cd>\n';
  xml += '          </CdOrPrtry>\n';
  xml += '        </Tp>\n';
  xml += `        <Amt Ccy="${opBal.currency}">${opBal.amount}</Amt>\n`;
  xml += `        <CdtDbtInd>${opBal.dcMark === 'C' ? 'CRDT' : 'DBIT'}</CdtDbtInd>\n`;
  xml += '        <Dt>\n';
  xml += `          <Dt>${opBal.date}</Dt>\n`;
  xml += '        </Dt>\n';
  xml += '      </Bal>\n';

  // Entries (field 61)
  for (let i = 0; i < field61Entries.length; i++) {
    const field61Entry = field61Entries[i];
    if (!field61Entry) continue;
    const entry = parseField61(field61Entry.value);
    const field86 = field86Map.get(i);

    xml += '      <Ntry>\n';
    xml += `        <Amt Ccy="${statementCurrency}">${entry.amount}</Amt>\n`;
    xml += `        <CdtDbtInd>${entry.dcMark === 'C' || entry.dcMark === 'RC' ? 'CRDT' : 'DBIT'}</CdtDbtInd>\n`;

    // Status
    if (entry.fundsCode === 'D') {
      xml += '        <Sts>\n';
      xml += '          <Cd>PDNG</Cd>\n';
      xml += '        </Sts>\n';
    } else {
      xml += '        <Sts>\n';
      xml += '          <Cd>BOOK</Cd>\n';
      xml += '        </Sts>\n';
    }

    // Value date
    xml += '        <ValDt>\n';
    xml += `          <Dt>${entry.valueDate}</Dt>\n`;
    xml += '        </ValDt>\n';

    // Booking date (entry date if present, otherwise value date)
    if (entry.entryDate) {
      // Combine MMDD with year from value date
      const valYear = entry.valueDate.substring(0, 4);
      const entryDateFull = `${valYear}-${entry.entryDate.substring(0, 2)}-${entry.entryDate.substring(2, 4)}`;
      xml += '        <BookgDt>\n';
      xml += `          <Dt>${entryDateFull}</Dt>\n`;
      xml += '        </BookgDt>\n';
    }

    // Bank Transaction Code
    xml += '        <BkTxCd>\n';
    xml += '          <Prtry>\n';
    xml += `            <Cd>${escapeXml(entry.txType)}</Cd>\n`;
    xml += '          </Prtry>\n';
    xml += '        </BkTxCd>\n';

    // Entry reference (bank reference)
    if (entry.bankRef) {
      xml += `        <NtryRef>${escapeXml(entry.bankRef)}</NtryRef>\n`;
    }

    // Entry details
    xml += '        <NtryDtls>\n';
    xml += '          <TxDtls>\n';
    xml += '            <Refs>\n';
    xml += `              <AcctSvcrRef>${escapeXml(entry.customerRef)}</AcctSvcrRef>\n`;
    xml += '            </Refs>\n';

    // Remittance info from field 86
    if (field86) {
      xml += '            <RmtInf>\n';
      xml += `              <Ustrd>${escapeXml(field86)}</Ustrd>\n`;
      xml += '            </RmtInf>\n';
    }

    xml += '          </TxDtls>\n';
    xml += '        </NtryDtls>\n';

    // Additional entry info (supplementary details)
    if (entry.supplementary) {
      xml += `        <AddtlNtryInf>${escapeXml(entry.supplementary)}</AddtlNtryInf>\n`;
    }

    xml += '      </Ntry>\n';
  }

  // Closing Balance
  xml += '      <Bal>\n';
  xml += '        <Tp>\n';
  xml += '          <CdOrPrtry>\n';
  xml += '            <Cd>CLBD</Cd>\n';
  xml += '          </CdOrPrtry>\n';
  xml += '        </Tp>\n';
  xml += `        <Amt Ccy="${clBal.currency}">${clBal.amount}</Amt>\n`;
  xml += `        <CdtDbtInd>${clBal.dcMark === 'C' ? 'CRDT' : 'DBIT'}</CdtDbtInd>\n`;
  xml += '        <Dt>\n';
  xml += `          <Dt>${clBal.date}</Dt>\n`;
  xml += '        </Dt>\n';
  xml += '      </Bal>\n';

  xml += '    </Stmt>\n';
  xml += '  </BkToCstmrStmt>\n';
  xml += '</Document>';

  return {
    translatedMessage: xml,
    sourceFormat: MessageFormat.MT,
    targetFormat: MessageFormat.MX,
    sourceType: MessageType.MT940,
    targetType: MessageType.CAMT053,
    warnings,
  };
}

/**
 * Translate camt.053 to MT940
 */
async function translateCamt053ToMt940(
  mx: MxMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  await loadMapping('mt940_camt053');

  // Helper: Get element text by path
  const getElement = (path: string): string => {
    const parts = path.split('/');
    let current: Element | null = mx.root;

    for (const part of parts) {
      if (!current) break;

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

  // Helper: Get all elements matching path
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

  // Extract camt.053 fields
  const stmtPath = 'BkToCstmrStmt/Stmt';
  const stmtId = getElement(`${stmtPath}/Id`);
  const stmtNb = getElement(`${stmtPath}/LglSeqNb`) || '1';

  // Account
  const accountIban = getElement(`${stmtPath}/Acct/Id/IBAN`);
  const accountOther = getElement(`${stmtPath}/Acct/Id/Othr/Id`);
  const account = accountIban || accountOther;
  const accountCcy = getElement(`${stmtPath}/Acct/Ccy`);

  // Get balances
  const balElements = getElements(`${stmtPath}/Bal`);
  let openingBalance = { ccy: '', amount: '', dcInd: '', date: '' };
  let closingBalance = { ccy: '', amount: '', dcInd: '', date: '' };

  for (const balEl of balElements) {
    const balTypeEl = balEl.querySelector('Tp CdOrPrtry Cd');
    const balTypeText = balTypeEl?.textContent;
    const balType = balTypeText ? balTypeText.trim() : undefined;
    const amtEl = balEl.querySelector('Amt');
    const ccy = amtEl?.getAttribute('Ccy') || accountCcy;
    const amtText = amtEl?.textContent;
    const amount = amtText ? amtText.trim() : '';
    const dcIndEl = balEl.querySelector('CdtDbtInd');
    const dcIndText = dcIndEl?.textContent;
    const dcInd = dcIndText ? dcIndText.trim() : '';
    const dateEl = balEl.querySelector('Dt Dt');
    const dateText = dateEl?.textContent;
    const date = dateText ? dateText.trim() : '';

    if (balType === 'OPBD') {
      openingBalance = { ccy, amount, dcInd, date };
    } else if (balType === 'CLBD') {
      closingBalance = { ccy, amount, dcInd, date };
    }
  }

  // Get entries
  const entryElements = getElements(`${stmtPath}/Ntry`);

  // Build MT940 message
  let mt = '';

  // Block 1 (Basic Header) - Use placeholder values
  mt += '{1:F01BANKBICAXXX0000000000}';

  // Block 2 (Application Header) - Output message
  mt += '{2:O9400000000000000000N}';

  // Block 3 (User Header) - Empty
  // mt += '{3:}'; // Optional, omit if empty

  // Block 4 (Text Block)
  mt += '{4:\n';

  // Field 20: Transaction Reference
  let field20Value = stmtId;
  if (field20Value.length > 16) {
    field20Value = field20Value.substring(0, 16);
    warnings.push({
      field_path: 'MT field 20',
      category: DataLossCategory.TRUNCATION,
      description: `Statement ID truncated from ${String(stmtId.length)} to 16 characters`,
    });
  }
  mt += `:20:${field20Value}\n`;

  // Field 25: Account Identification
  mt += `:25:${account}\n`;

  // Field 28C: Statement Number/Sequence Number
  mt += `:28C:${stmtNb}\n`;

  // Field 60F/60M: Opening Balance
  const opDcMark = openingBalance.dcInd === 'CRDT' ? 'C' : 'D';
  const opDate = convertMxDate(openingBalance.date);
  const opAmount = convertMxAmount(openingBalance.amount);
  mt += `:60F:${opDcMark}${opDate}${openingBalance.ccy}${opAmount}\n`;

  // Field 61: Statement Lines (entries)
  for (const entryEl of entryElements) {
    const amtEl = entryEl.querySelector('Amt');
    const amtText = amtEl?.textContent;
    const amount = amtText ? amtText.trim() : '';
    const dcIndEl = entryEl.querySelector('CdtDbtInd');
    const dcIndText = dcIndEl?.textContent;
    const dcInd = dcIndText ? dcIndText.trim() : '';
    const valueDateEl = entryEl.querySelector('ValDt Dt');
    const valueDateText = valueDateEl?.textContent;
    const valueDate = valueDateText ? valueDateText.trim() : '';
    const txTypeEl = entryEl.querySelector('BkTxCd Prtry Cd');
    const txTypeText = txTypeEl?.textContent;
    const txType = txTypeText ? txTypeText.trim() : 'NTRF';
    const acctSvcrRefEl = entryEl.querySelector('NtryDtls TxDtls Refs AcctSvcrRef');
    const acctSvcrRefText = acctSvcrRefEl?.textContent;
    const acctSvcrRef = acctSvcrRefText ? acctSvcrRefText.trim() : 'NONREF';
    const ntryRefEl = entryEl.querySelector('NtryRef');
    const ntryRefText = ntryRefEl?.textContent;
    const ntryRef = ntryRefText ? ntryRefText.trim() : undefined;

    const valDateMt = convertMxDate(valueDate);
    const dcMark = dcInd === 'CRDT' ? 'C' : 'D';
    const amountMt = convertMxAmount(amount);

    mt += `:61:${valDateMt}${dcMark}${amountMt}${txType}${acctSvcrRef}`;
    if (ntryRef) {
      mt += `//${ntryRef}`;
    }
    mt += '\n';

    // Field 86: Information to Account Owner (remittance info)
    const rmtInfoEl = entryEl.querySelector('NtryDtls TxDtls RmtInf Ustrd');
    const rmtInfoText = rmtInfoEl?.textContent;
    const rmtInfo = rmtInfoText ? rmtInfoText.trim() : undefined;
    if (rmtInfo) {
      mt += `:86:${rmtInfo}\n`;
    }
  }

  // Field 62F/62M: Closing Balance
  const clDcMark = closingBalance.dcInd === 'CRDT' ? 'C' : 'D';
  const clDate = convertMxDate(closingBalance.date);
  const clAmount = convertMxAmount(closingBalance.amount);
  mt += `:62F:${clDcMark}${clDate}${closingBalance.ccy}${clAmount}\n`;

  mt += '-}';

  // Block 5 (Trailer) - Empty
  mt += '{5:}';

  return {
    translatedMessage: mt,
    sourceFormat: MessageFormat.MX,
    targetFormat: MessageFormat.MT,
    sourceType: MessageType.CAMT053,
    targetType: MessageType.MT940,
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
    case '202':
      return translateMt202ToPacs009(mt, sourceMessage);
    case '940':
      return translateMt940ToCamt053(mt, sourceMessage);
    case '942':
      return translateMt942ToCamt052(mt, sourceMessage);
    default:
      throw new Error(`Translation from MT${messageType} to MX not yet supported`);
  }
}

/**
 * Translate MT942 to camt.052
 */
async function translateMt942ToCamt052(
  mt: MtMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  await loadMapping('mt942_camt052');

  // Extract MT942 fields
  const fields = new Map<string, string>();
  const field61Entries: Array<{ tag: string; value: string }> = [];
  const field86Map = new Map<number, string>();

  let field61Index = 0;
  let lastWasField61 = false;

  for (const field of mt.block4?.fields || []) {
    fields.set(field.tag, field.value);

    if (field.tag === '61') {
      field61Entries.push({ tag: field.tag, value: field.value });
      lastWasField61 = true;
      field61Index++;
    } else if (field.tag === '86' && lastWasField61) {
      field86Map.set(field61Index - 1, field.value);
      lastWasField61 = false;
    } else {
      lastWasField61 = false;
    }
  }

  // Helper functions (same as MT940)
  const getField = (tag: string): string | undefined => fields.get(tag);

  const convertMtDate = (mtDate: string): string => {
    const yy = parseInt(mtDate.substring(0, 2), 10);
    const mm = mtDate.substring(2, 4);
    const dd = mtDate.substring(4, 6);
    const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
    return `${String(yyyy)}-${mm}-${dd}`;
  };

  const convertMtAmount = (mtAmount: string): string => {
    return mtAmount.replace(',', '.');
  };

  const parseField61 = (value: string): {
    valueDate: string;
    entryDate?: string | undefined;
    dcMark: string;
    fundsCode?: string | undefined;
    amount: string;
    txType: string;
    customerRef: string;
    bankRef?: string | undefined;
    supplementary?: string | undefined;
  } => {
    let pos = 0;
    const valueDate = value.substring(pos, pos + 6);
    pos += 6;

    let entryDate: string | undefined;
    const nextChars = value.substring(pos, pos + 4);
    if (nextChars && /^\d{4}$/.test(nextChars)) {
      entryDate = nextChars;
      pos += 4;
    } else if (nextChars && /^\d{2}$/.test(value.substring(pos, pos + 2))) {
      entryDate = value.substring(pos, pos + 2);
      pos += 2;
    }

    let dcMark = value.substring(pos, pos + 2);
    if (dcMark === 'RC' || dcMark === 'RD') {
      pos += 2;
    } else {
      dcMark = value.substring(pos, pos + 1);
      pos += 1;
    }

    let fundsCode: string | undefined;
    const fundsChar = value.substring(pos, pos + 1);
    if (fundsChar && /[A-Z]/.test(fundsChar)) {
      fundsCode = fundsChar;
      pos += 1;
    }

    const amountMatch = /^(\d+,\d+|\d+)/.exec(value.substring(pos));
    let amount = '';
    if (amountMatch && amountMatch[0]) {
      amount = amountMatch[0];
      pos += amountMatch[0].length;
    }

    const txType = value.substring(pos, pos + 4);
    pos += 4;

    let customerRef = '';
    const refMatch = /^([^/\n]+)/.exec(value.substring(pos));
    if (refMatch && refMatch[1]) {
      customerRef = refMatch[1];
      pos += refMatch[1].length;
    }

    let bankRef: string | undefined;
    if (value.substring(pos, pos + 2) === '//') {
      pos += 2;
      const bankRefMatch = /^([^\n]+)/.exec(value.substring(pos));
      if (bankRefMatch && bankRefMatch[1]) {
        bankRef = bankRefMatch[1];
        pos += bankRefMatch[1].length;
      }
    }

    let supplementary: string | undefined;
    if (value.substring(pos, pos + 1) === '\n' && pos + 1 < value.length) {
      supplementary = value.substring(pos + 1);
    }

    return {
      valueDate: convertMtDate(valueDate),
      entryDate,
      dcMark,
      fundsCode,
      amount: convertMtAmount(amount),
      txType,
      customerRef,
      bankRef,
      supplementary,
    };
  };

  // Get report reference (field 20)
  const rptId = getField('20') || 'NOTPROVIDED';

  // Get account (field 25)
  const account = getField('25') || '';

  const isIban = (acct: string): boolean => {
    return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(acct);
  };

  // Get report number (field 28C)
  const field28C = getField('28C') || '';
  const rptNbMatch = /^(\d+)/.exec(field28C);
  const rptNb = rptNbMatch && rptNbMatch[1] ? rptNbMatch[1] : '1';

  // Get date/time indication (field 13D)
  const field13D = getField('13D') || '';
  let creationDateTime = new Date().toISOString();
  if (field13D && field13D.length >= 11) {
    // Format: YYMMDD+HHMM
    const datePart = field13D.substring(0, 6);
    const timePart = field13D.substring(7, 11);
    const dateIso = convertMtDate(datePart);
    const hh = timePart.substring(0, 2);
    const mm = timePart.substring(2, 4);
    creationDateTime = `${dateIso}T${hh}:${mm}:00`;
  }

  // Get floor limit (field 34F)
  const field34F = getField('34F');
  let reportCurrency = '';
  if (field34F && field34F.length >= 3) {
    reportCurrency = field34F.substring(0, 3);
  }

  // Get summary totals (fields 90D, 90C)
  const field90D = getField('90D'); // Number and sum of debits
  const field90C = getField('90C'); // Number and sum of credits

  const parseSummary = (value: string): { count: string; currency: string; amount: string } => {
    const countMatch = /^(\d+)/.exec(value);
    const count = countMatch && countMatch[1] ? countMatch[1] : '0';
    const currency = value.substring(count.length, count.length + 3);
    const amount = value.substring(count.length + 3);
    return { count, currency, amount: convertMtAmount(amount) };
  };

  let debitSummary = { count: '0', currency: reportCurrency, amount: '0' };
  let creditSummary = { count: '0', currency: reportCurrency, amount: '0' };

  if (field90D) {
    debitSummary = parseSummary(field90D);
    if (!reportCurrency) reportCurrency = debitSummary.currency;
  }
  if (field90C) {
    creditSummary = parseSummary(field90C);
    if (!reportCurrency) reportCurrency = creditSummary.currency;
  }

  // Generate MsgId
  const msgId = `MT942-${rptId}-${String(Date.now())}`;

  // Build camt.052 XML
  const namespace = 'urn:iso:std:iso:20022:tech:xsd:camt.052.001.10';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<Document xmlns="${namespace}">\n`;
  xml += '  <BkToCstmrAcctRpt>\n';

  // Group Header
  xml += '    <GrpHdr>\n';
  xml += `      <MsgId>${escapeXml(msgId)}</MsgId>\n`;
  xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;
  xml += '    </GrpHdr>\n';

  // Report
  xml += '    <Rpt>\n';
  xml += `      <Id>${escapeXml(rptId)}</Id>\n`;
  xml += `      <LglSeqNb>${rptNb}</LglSeqNb>\n`;
  xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;

  // Account
  xml += '      <Acct>\n';
  xml += '        <Id>\n';
  if (isIban(account)) {
    xml += `          <IBAN>${escapeXml(account)}</IBAN>\n`;
  } else {
    xml += '          <Othr>\n';
    xml += `            <Id>${escapeXml(account)}</Id>\n`;
    xml += '          </Othr>\n';
  }
  xml += '        </Id>\n';
  if (reportCurrency) {
    xml += `        <Ccy>${reportCurrency}</Ccy>\n`;
  }
  xml += '      </Acct>\n';

  // Entries (field 61)
  for (let i = 0; i < field61Entries.length; i++) {
    const field61Entry = field61Entries[i];
    if (!field61Entry) continue;
    const entry = parseField61(field61Entry.value);
    const field86 = field86Map.get(i);

    xml += '      <Ntry>\n';
    xml += `        <Amt Ccy="${reportCurrency}">${entry.amount}</Amt>\n`;
    xml += `        <CdtDbtInd>${entry.dcMark === 'C' || entry.dcMark === 'RC' ? 'CRDT' : 'DBIT'}</CdtDbtInd>\n`;

    if (entry.fundsCode === 'D') {
      xml += '        <Sts>\n';
      xml += '          <Cd>PDNG</Cd>\n';
      xml += '        </Sts>\n';
    } else {
      xml += '        <Sts>\n';
      xml += '          <Cd>BOOK</Cd>\n';
      xml += '        </Sts>\n';
    }

    xml += '        <ValDt>\n';
    xml += `          <Dt>${entry.valueDate}</Dt>\n`;
    xml += '        </ValDt>\n';

    if (entry.entryDate) {
      const valYear = entry.valueDate.substring(0, 4);
      const entryDateFull = `${valYear}-${entry.entryDate.substring(0, 2)}-${entry.entryDate.substring(2, 4)}`;
      xml += '        <BookgDt>\n';
      xml += `          <Dt>${entryDateFull}</Dt>\n`;
      xml += '        </BookgDt>\n';
    }

    xml += '        <BkTxCd>\n';
    xml += '          <Prtry>\n';
    xml += `            <Cd>${escapeXml(entry.txType)}</Cd>\n`;
    xml += '          </Prtry>\n';
    xml += '        </BkTxCd>\n';

    if (entry.bankRef) {
      xml += `        <NtryRef>${escapeXml(entry.bankRef)}</NtryRef>\n`;
    }

    xml += '        <NtryDtls>\n';
    xml += '          <TxDtls>\n';
    xml += '            <Refs>\n';
    xml += `              <AcctSvcrRef>${escapeXml(entry.customerRef)}</AcctSvcrRef>\n`;
    xml += '            </Refs>\n';

    if (field86) {
      xml += '            <RmtInf>\n';
      xml += `              <Ustrd>${escapeXml(field86)}</Ustrd>\n`;
      xml += '            </RmtInf>\n';
    }

    xml += '          </TxDtls>\n';
    xml += '        </NtryDtls>\n';

    if (entry.supplementary) {
      xml += `        <AddtlNtryInf>${escapeXml(entry.supplementary)}</AddtlNtryInf>\n`;
    }

    xml += '      </Ntry>\n';
  }

  // Transactions Summary
  xml += '      <TxsSummary>\n';

  // Total debit entries
  if (debitSummary.count !== '0') {
    xml += '        <TtlDbtNtries>\n';
    xml += `          <NbOfNtries>${debitSummary.count}</NbOfNtries>\n`;
    xml += `          <Sum Ccy="${debitSummary.currency}">${debitSummary.amount}</Sum>\n`;
    xml += '        </TtlDbtNtries>\n';
  }

  // Total credit entries
  if (creditSummary.count !== '0') {
    xml += '        <TtlCdtNtries>\n';
    xml += `          <NbOfNtries>${creditSummary.count}</NbOfNtries>\n`;
    xml += `          <Sum Ccy="${creditSummary.currency}">${creditSummary.amount}</Sum>\n`;
    xml += '        </TtlCdtNtries>\n';
  }

  xml += '      </TxsSummary>\n';

  xml += '    </Rpt>\n';
  xml += '  </BkToCstmrAcctRpt>\n';
  xml += '</Document>';

  return {
    translatedMessage: xml,
    sourceFormat: MessageFormat.MT,
    targetFormat: MessageFormat.MX,
    sourceType: MessageType.MT942,
    targetType: MessageType.CAMT052,
    warnings,
  };
}

/**
 * Translate camt.052 to MT942
 */
async function translateCamt052ToMt942(
  mx: MxMessage,
  _sourceMessage: string,
): Promise<TranslationResult> {
  const warnings: DataLossWarning[] = [];

  // Load mapping specification
  await loadMapping('mt942_camt052');

  // Helper: Get element text by path
  const getElement = (path: string): string => {
    const parts = path.split('/');
    let current: Element | null = mx.root;

    for (const part of parts) {
      if (!current) break;

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

  // Helper: Get all elements matching path
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

  // Extract camt.052 fields
  const rptPath = 'BkToCstmrAcctRpt/Rpt';
  const rptId = getElement(`${rptPath}/Id`);
  const rptNb = getElement(`${rptPath}/LglSeqNb`) || '1';
  const creationDateTime = getElement(`${rptPath}/CreDtTm`);

  // Account
  const accountIban = getElement(`${rptPath}/Acct/Id/IBAN`);
  const accountOther = getElement(`${rptPath}/Acct/Id/Othr/Id`);
  const account = accountIban || accountOther;
  const accountCcy = getElement(`${rptPath}/Acct/Ccy`);

  // Get transactions summary
  const ttlDbtCount = getElement(`${rptPath}/TxsSummary/TtlDbtNtries/NbOfNtries`) || '0';
  const ttlCdtCount = getElement(`${rptPath}/TxsSummary/TtlCdtNtries/NbOfNtries`) || '0';

  // Get debit sum
  const ttlDbtSumElements = getElements(`${rptPath}/TxsSummary/TtlDbtNtries/Sum`);
  let ttlDbtCcy = accountCcy;
  let ttlDbtSum = '0';
  const firstDbtSumEl = ttlDbtSumElements[0];
  if (firstDbtSumEl) {
    ttlDbtCcy = firstDbtSumEl.getAttribute('Ccy') || accountCcy;
    const textContent = firstDbtSumEl.textContent;
    ttlDbtSum = textContent ? textContent.trim() : '0';
  }

  // Get credit sum
  const ttlCdtSumElements = getElements(`${rptPath}/TxsSummary/TtlCdtNtries/Sum`);
  let ttlCdtCcy = accountCcy;
  let ttlCdtSum = '0';
  const firstCdtSumEl = ttlCdtSumElements[0];
  if (firstCdtSumEl) {
    ttlCdtCcy = firstCdtSumEl.getAttribute('Ccy') || accountCcy;
    const textContent = firstCdtSumEl.textContent;
    ttlCdtSum = textContent ? textContent.trim() : '0';
  }

  // Get entries
  const entryElements = getElements(`${rptPath}/Ntry`);

  // Build MT942 message
  let mt = '';

  // Block 1 (Basic Header)
  mt += '{1:F01BANKBICAXXX0000000000}';

  // Block 2 (Application Header) - Output message
  mt += '{2:O9420000000000000000N}';

  // Block 4 (Text Block)
  mt += '{4:\n';

  // Field 20: Transaction Reference
  let field20Value = rptId;
  if (field20Value.length > 16) {
    field20Value = field20Value.substring(0, 16);
    warnings.push({
      field_path: 'MT field 20',
      category: DataLossCategory.TRUNCATION,
      description: `Report ID truncated from ${String(rptId.length)} to 16 characters`,
    });
  }
  mt += `:20:${field20Value}\n`;

  // Field 25: Account Identification
  mt += `:25:${account}\n`;

  // Field 28C: Report Number/Sequence Number
  mt += `:28C:${rptNb}\n`;

  // Field 13D: Date/Time Indication (from CreDtTm)
  if (creationDateTime) {
    const dateMatch = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(creationDateTime);
    if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3] && dateMatch[4] && dateMatch[5]) {
      const yyyy = dateMatch[1];
      const mm = dateMatch[2];
      const dd = dateMatch[3];
      const hh = dateMatch[4];
      const min = dateMatch[5];
      const yy = yyyy.substring(2, 4);
      mt += `:13D:${yy}${mm}${dd}+${hh}${min}\n`;
    }
  }

  // Field 61: Statement Lines (entries)
  for (const entryEl of entryElements) {
    const amtEl = entryEl.querySelector('Amt');
    const amtText = amtEl?.textContent;
    const amount = amtText ? amtText.trim() : '';
    const dcIndEl = entryEl.querySelector('CdtDbtInd');
    const dcIndText = dcIndEl?.textContent;
    const dcInd = dcIndText ? dcIndText.trim() : '';
    const valueDateEl = entryEl.querySelector('ValDt Dt');
    const valueDateText = valueDateEl?.textContent;
    const valueDate = valueDateText ? valueDateText.trim() : '';
    const txTypeEl = entryEl.querySelector('BkTxCd Prtry Cd');
    const txTypeText = txTypeEl?.textContent;
    const txType = txTypeText ? txTypeText.trim() : 'NTRF';
    const acctSvcrRefEl = entryEl.querySelector('NtryDtls TxDtls Refs AcctSvcrRef');
    const acctSvcrRefText = acctSvcrRefEl?.textContent;
    const acctSvcrRef = acctSvcrRefText ? acctSvcrRefText.trim() : 'NONREF';
    const ntryRefEl = entryEl.querySelector('NtryRef');
    const ntryRefText = ntryRefEl?.textContent;
    const ntryRef = ntryRefText ? ntryRefText.trim() : undefined;

    const valDateMt = convertMxDate(valueDate);
    const dcMark = dcInd === 'CRDT' ? 'C' : 'D';
    const amountMt = convertMxAmount(amount);

    mt += `:61:${valDateMt}${dcMark}${amountMt}${txType}${acctSvcrRef}`;
    if (ntryRef) {
      mt += `//${ntryRef}`;
    }
    mt += '\n';

    // Field 86: Information to Account Owner
    const rmtInfoEl = entryEl.querySelector('NtryDtls TxDtls RmtInf Ustrd');
    const rmtInfoText = rmtInfoEl?.textContent;
    const rmtInfo = rmtInfoText ? rmtInfoText.trim() : undefined;
    if (rmtInfo) {
      mt += `:86:${rmtInfo}\n`;
    }
  }

  // Field 90D: Number and Sum of Debit Entries
  if (ttlDbtCount !== '0') {
    const dbtSumMt = convertMxAmount(ttlDbtSum);
    mt += `:90D:${ttlDbtCount}${ttlDbtCcy}${dbtSumMt}\n`;
  }

  // Field 90C: Number and Sum of Credit Entries
  if (ttlCdtCount !== '0') {
    const cdtSumMt = convertMxAmount(ttlCdtSum);
    mt += `:90C:${ttlCdtCount}${ttlCdtCcy}${cdtSumMt}\n`;
  }

  mt += '-}';

  // Block 5 (Trailer) - Empty
  mt += '{5:}';

  return {
    translatedMessage: mt,
    sourceFormat: MessageFormat.MX,
    targetFormat: MessageFormat.MT,
    sourceType: MessageType.CAMT052,
    targetType: MessageType.MT942,
    warnings,
  };
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
  } else if (namespace.includes('pacs.009')) {
    return translatePacs009ToMt202(mx, sourceMessage);
  } else if (namespace.includes('camt.053')) {
    return translateCamt053ToMt940(mx, sourceMessage);
  } else if (namespace.includes('camt.052')) {
    return translateCamt052ToMt942(mx, sourceMessage);
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
