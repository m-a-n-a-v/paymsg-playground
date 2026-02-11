import { MessageFormat, MessageType } from '../engine/types';

export interface SampleMessage {
  id: string;
  label: string;
  description: string;
  format: MessageFormat;
  messageType: MessageType;
  content: string;
}

export const sampleMessages: SampleMessage[] = [
  {
    id: 'mt103-sepa-eur',
    label: 'MT103 - SEPA EUR Transfer',
    description: 'Simple EUR SEPA credit transfer from Germany to France',
    format: MessageFormat.MT,
    messageType: MessageType.MT103,
    content: `{1:F01DEUTDEFFAXXX0000000000}{2:I103BNPAFRPPXXXXN}{3:{119:STP}{121:12345678-90ab-cdef-1234-567890abcdef}}{4:
:20:SEPA20260210001
:23B:CRED
:23E:SDVA
:32A:260212EUR2500,00
:50K:/DE89370400440532013000
ANNA SCHMIDT
MOZARTSTRASSE 15
80331 MUENCHEN
:57A:BNPAFRPPXXX
:59:/FR1420041010050500013M02606
PIERRE MARTIN
12 AVENUE DES CHAMPS ELYSEES
75008 PARIS
:70:/CINV/2026-INV-456
SEPA PAYMENT FOR INVOICE 2026-INV-456
:71A:SHA
-}`,
  },
  {
    id: 'mt103-usd-wire',
    label: 'MT103 - USD Wire with Intermediary',
    description: 'Cross-border USD wire transfer with sender and receiver correspondent banks',
    format: MessageFormat.MT,
    messageType: MessageType.MT103,
    content: `{1:F01BOFAUS3NAXXX0000000000}{2:I103CHASUS33XXXXN}{3:{108:FEDWIRE20260210}{121:abcdef01-2345-6789-abcd-ef0123456789}}{4:
:20:WIRE20260210789
:23B:CRED
:32A:260210USD50000,00
:50K:/1234567890
ACME CORPORATION
1000 MAIN STREET
NEW YORK NY 10001
USA
:52A:/987654321000
BOFAUS3NXXX
:57A:/111222333444
CHASUS33XXX
:59:/555666777888
GLOBAL TRADING LLC
500 MARKET STREET
SAN FRANCISCO CA 94105
USA
:70:/RFB/PAYMENT FOR GOODS
PURCHASE ORDER 2026-PO-12345
:71A:OUR
:71F:USD25,00
-}`,
  },
  {
    id: 'mt202-interbank',
    label: 'MT202 - Interbank Transfer',
    description: 'Financial institution to financial institution credit transfer',
    format: MessageFormat.MT,
    messageType: MessageType.MT202,
    content: `{1:F01HSBCGB2LAXXX0000000000}{2:I202SMBCJPJTXXXXN}{4:
:20:HSBC20231115GB
:21:CUST PAY REF001
:32A:231116GBP75000,00
:52D:HSBC BANK PLC
LONDON UK
:57A:/GB29NWBK60161331926819
SMBCJPJT
:58D:/ACCOUNT987654
SUMITOMO MITSUI BANKING CORP
TOKYO JAPAN
:72:/INS/CREDBEN
/REF/UNDERLYING CUSTOMER PMT
-}`,
  },
  {
    id: 'mt940-daily-statement',
    label: 'MT940 - End-of-Day Statement',
    description: 'Bank statement with multiple transaction entries and balances',
    format: MessageFormat.MT,
    messageType: MessageType.MT940,
    content: `{1:F01BNPAFRPPAXXX0000000000}{2:I940CORPORATEXXXN}{4:
:20:STMT20231115002
:25:FR7630006000011234567890189
:28C:127/1
:60F:C231114EUR50000,00
:61:2311150C15000,00NTRF020231115001//BANK REF 001
:86:?20Payment from Customer A
?32ACME CORPORATION
?60DE89370400440532013000
:61:2311150C5000,00NSTD021115STDO001//BANK REF 002
:86:?20Standing Order - Monthly Rent
?32PROPERTY MANAGEMENT LTD
:61:2311150D2500,00NCHK022115CHK123//BANK REF 003
Presented cheque
:86:?20Cheque Payment
?32Office Supplies Inc
?60GB29NWBK60161331926819
:61:2311150C25000,00NMSC023115MSC001//BANK REF 004
:86:?20Miscellaneous Credit
?32International Client XYZ
?60US1234567890
:61:231115D8000,00NDDT024115DEB001//BANK REF 005
:86:?20Direct Debit - Utilities
?32Power Company Ltd
:61:2311150C12500,00NTRF025115INT002//BANK REF 006
:86:?20Incoming Wire Transfer
?32Business Partner Corp
?60IT60X0542811101000000123456
:62F:C231115EUR97000,00
:64:C231115EUR95000,00
-}`,
  },
  {
    id: 'mt942-intraday',
    label: 'MT942 - Intraday Interim Report',
    description: 'Intraday account report with floor limit transactions',
    format: MessageFormat.MT,
    messageType: MessageType.MT942,
    content: `{1:F01BNPAFRPPAXXX0000000000}{2:I942CORPORATEXXXN}{4:
:20:INTR20231115002
:25P:BNPAFRPP/FR7630006000011234567890189
:28C:3/1
:34F:EUR10000,00
:13D:231115+1430
:61:2311150C25000,00NTRF151115LRG001//BANK REF 151
:86:?20Large Incoming Wire Transfer
?32INTERNATIONAL SUPPLIER PAYMENT
?60GB29NWBK60161331926819
:61:2311150C15000,00NTRF152115LRG002//BANK REF 152
:86:?20Customer Payment Received
?32CORPORATE CLIENT ABC
:61:231115D22000,00NTRF153115LRG003//BANK REF 153
:86:?20Outgoing Payment - Vendor
?32EQUIPMENT SUPPLIER XYZ
:90D:8EUR45000,00
:90C:12EUR78000,00
-}`,
  },
  {
    id: 'pacs008-sepa',
    label: 'pacs.008 - Customer Credit Transfer',
    description: 'ISO 20022 SEPA customer credit transfer (pacs.008.001.10)',
    format: MessageFormat.MX,
    messageType: MessageType.PACS008,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSGID-20260210-003</MsgId>
      <CreDtTm>2026-02-10T10:15:22</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <IntrBkSttlmDt>2026-02-11</IntrBkSttlmDt>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Cd>TARGET2</Cd>
        </ClrSys>
      </SttlmInf>
      <InstgAgt>
        <FinInstnId>
          <BICFI>DEUTDEFFXXX</BICFI>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <BICFI>BNPAFRPPXXX</BICFI>
        </FinInstnId>
      </InstdAgt>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR-DE-20260210-003</InstrId>
        <EndToEndId>E2E-SEPA-20260210-003</EndToEndId>
        <UETR>b7c3d4e5-6f78-49ab-9cde-f012345678ab</UETR>
      </PmtId>
      <PmtTpInf>
        <InstrPrty>NORM</InstrPrty>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>INST</Cd>
        </LclInstrm>
        <CtgyPurp>
          <Cd>CASH</Cd>
        </CtgyPurp>
      </PmtTpInf>
      <IntrBkSttlmAmt Ccy="EUR">5250.75</IntrBkSttlmAmt>
      <IntrBkSttlmDt>2026-02-11</IntrBkSttlmDt>
      <ChrgBr>SHAR</ChrgBr>
      <Dbtr>
        <Nm>Schmidt und Partner GmbH</Nm>
        <PstlAdr>
          <AdrLine>Hauptstrasse 123</AdrLine>
          <AdrLine>60311 Frankfurt am Main</AdrLine>
          <Ctry>DE</Ctry>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>DE89370400440532013000</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>DEUTDEFFXXX</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>BNPAFRPPXXX</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>Société Exemple SARL</Nm>
        <PstlAdr>
          <AdrLine>15 Avenue des Champs-Élysées</AdrLine>
          <AdrLine>75008 Paris</AdrLine>
          <Ctry>FR</Ctry>
        </PstlAdr>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>FR1420041010050500013M02606</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>CASH</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>Invoice 2026-FR-1542 dated 2026-01-25</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`,
  },
  {
    id: 'pacs009-fi-transfer',
    label: 'pacs.009 - FI Credit Transfer',
    description: 'ISO 20022 financial institution credit transfer with intermediary (pacs.009.001.10)',
    format: MessageFormat.MX,
    messageType: MessageType.PACS009,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10">
  <FICdtTrf>
    <GrpHdr>
      <MsgId>FI20260210DEUTDEFF001</MsgId>
      <CreDtTm>2026-02-10T10:15:30Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <TtlIntrBkSttlmAmt Ccy="USD">250000.00</TtlIntrBkSttlmAmt>
      <IntrBkSttlmDt>2026-02-10</IntrBkSttlmDt>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Cd>FED</Cd>
        </ClrSys>
      </SttlmInf>
      <InstgAgt>
        <FinInstnId>
          <BICFI>DEUTDEFF</BICFI>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <BICFI>CHASUS33</BICFI>
        </FinInstnId>
      </InstdAgt>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>DEUTDEFF-FI-20260210-001</InstrId>
        <EndToEndId>CHASUS33-REF-20260210-001</EndToEndId>
        <TxId>TXN-20260210-001</TxId>
        <UETR>f47ac10b-58cc-4372-a567-0e02b2c3d479</UETR>
      </PmtId>
      <PmtTpInf>
        <InstrPrty>HIGH</InstrPrty>
        <SvcLvl>
          <Prtry>G001</Prtry>
        </SvcLvl>
      </PmtTpInf>
      <IntrBkSttlmAmt Ccy="USD">250000.00</IntrBkSttlmAmt>
      <IntrBkSttlmDt>2026-02-10</IntrBkSttlmDt>
      <SttlmTmIndctn>
        <DbtDtTm>2026-02-10T10:00:00Z</DbtDtTm>
      </SttlmTmIndctn>
      <InstgAgt>
        <FinInstnId>
          <BICFI>DEUTDEFF</BICFI>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <BICFI>CHASUS33</BICFI>
        </FinInstnId>
      </InstdAgt>
      <IntrmyAgt1>
        <FinInstnId>
          <BICFI>BOFAUS3N</BICFI>
        </FinInstnId>
      </IntrmyAgt1>
      <Cdtr>
        <FinInstnId>
          <BICFI>CHASUS33</BICFI>
          <Nm>JPMorgan Chase Bank N.A.</Nm>
          <PstlAdr>
            <StrtNm>Park Avenue</StrtNm>
            <BldgNb>383</BldgNb>
            <PstCd>10179</PstCd>
            <TwnNm>New York</TwnNm>
            <CtrySubDvsn>NY</CtrySubDvsn>
            <Ctry>US</Ctry>
          </PstlAdr>
        </FinInstnId>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>021000021-12345678</Id>
          </Othr>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>CHASUS33</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <InstrForNxtAgt>
        <Cd>PHOB</Cd>
        <InstrInf>/INS/Priority high-value transfer for same-day settlement via Fedwire</InstrInf>
      </InstrForNxtAgt>
      <RmtInf>
        <Ustrd>Interbank settlement for cross-border payment processing</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FICdtTrf>
</Document>`,
  },
  {
    id: 'camt053-daily-statement',
    label: 'camt.053 - Bank Statement',
    description: 'ISO 20022 end-of-day bank-to-customer statement (camt.053.001.10)',
    format: MessageFormat.MX,
    messageType: MessageType.CAMT053,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.10">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>DAILY-STMT-20260209-GB</MsgId>
      <CreDtTm>2026-02-09T22:00:00Z</CreDtTm>
    </GrpHdr>
    <Stmt>
      <Id>STMT-GB22HBUK40127612345678-20260209</Id>
      <LglSeqNb>365</LglSeqNb>
      <CreDtTm>2026-02-09T22:00:00Z</CreDtTm>
      <FrToDt>
        <FrDtTm>2026-02-09T00:00:00Z</FrDtTm>
        <ToDtTm>2026-02-09T23:59:59Z</ToDtTm>
      </FrToDt>
      <Acct>
        <Id>
          <IBAN>GB82WEST12345698765432</IBAN>
        </Id>
        <Tp>
          <Prtry>CURRENT</Prtry>
        </Tp>
        <Ccy>GBP</Ccy>
        <Nm>Business Current Account</Nm>
        <Ownr>
          <Nm>Tech Innovations Ltd</Nm>
          <PstlAdr>
            <StrtNm>Oxford Street</StrtNm>
            <BldgNb>100</BldgNb>
            <PstCd>W1D 1LL</PstCd>
            <TwnNm>London</TwnNm>
            <Ctry>GB</Ctry>
          </PstlAdr>
          <Id>
            <OrgId>
              <Othr>
                <Id>GB123456789</Id>
                <SchmeNm>
                  <Cd>COID</Cd>
                </SchmeNm>
              </Othr>
            </OrgId>
          </Id>
        </Ownr>
        <Svcr>
          <FinInstnId>
            <BICFI>HSBCGB2L</BICFI>
            <Nm>HSBC UK Bank plc</Nm>
            <PstlAdr>
              <TwnNm>London</TwnNm>
              <Ctry>GB</Ctry>
            </PstlAdr>
          </FinInstnId>
        </Svcr>
      </Acct>
      <Bal>
        <Tp>
          <CdOrPrtry>
            <Cd>OPBD</Cd>
          </CdOrPrtry>
          <SubTp>
            <Cd>FINAL</Cd>
          </SubTp>
        </Tp>
        <Amt Ccy="GBP">50000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt>
          <Dt>2026-02-09</Dt>
        </Dt>
      </Bal>
      <Bal>
        <Tp>
          <CdOrPrtry>
            <Cd>CLBD</Cd>
          </CdOrPrtry>
          <SubTp>
            <Cd>FINAL</Cd>
          </SubTp>
        </Tp>
        <Amt Ccy="GBP">47350.50</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt>
          <Dt>2026-02-09</Dt>
        </Dt>
      </Bal>
      <TxsSummary>
        <TtlNtries>
          <NbOfNtries>3</NbOfNtries>
          <Sum>2650.00</Sum>
        </TtlNtries>
        <TtlCdtNtries>
          <NbOfNtries>1</NbOfNtries>
          <Sum>5000.00</Sum>
        </TtlCdtNtries>
        <TtlDbtNtries>
          <NbOfNtries>2</NbOfNtries>
          <Sum>7650.00</Sum>
        </TtlDbtNtries>
      </TxsSummary>
      <Ntry>
        <NtryRef>REF-20260209-GB-001</NtryRef>
        <Amt Ccy="GBP">5000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>
          <Cd>BOOK</Cd>
        </Sts>
        <BookgDt>
          <Dt>2026-02-09</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-09</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
            <Issr>HSBC</Issr>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>HSBC-TRF-20260209-001</AcctSvcrRef>
              <EndToEndId>CLIENT-PAYMENT-12345</EndToEndId>
            </Refs>
            <AmtDtls>
              <InstdAmt>
                <Amt Ccy="GBP">5000.00</Amt>
              </InstdAmt>
            </AmtDtls>
            <RltdPties>
              <Dbtr>
                <Nm>Enterprise Solutions Inc</Nm>
              </Dbtr>
              <DbtrAcct>
                <Id>
                  <IBAN>GB29NWBK60161331926819</IBAN>
                </Id>
              </DbtrAcct>
            </RltdPties>
            <RmtInf>
              <Ustrd>Payment for professional services - Project Phoenix Q1 2026</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <NtryRef>REF-20260209-GB-002</NtryRef>
        <Amt Ccy="GBP">2500.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts>
          <Cd>BOOK</Cd>
        </Sts>
        <BookgDt>
          <Dt>2026-02-09</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-09</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
            <Issr>HSBC</Issr>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>HSBC-PAY-20260209-002</AcctSvcrRef>
              <EndToEndId>SALARY-RUN-FEB2026</EndToEndId>
            </Refs>
            <RltdPties>
              <Cdtr>
                <Nm>Staff Payroll Account</Nm>
              </Cdtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Payroll transfer - February 2026</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <NtryRef>REF-20260209-GB-003</NtryRef>
        <Amt Ccy="GBP">5150.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <RvslInd>true</RvslInd>
        <Sts>
          <Cd>BOOK</Cd>
        </Sts>
        <BookgDt>
          <Dt>2026-02-09</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-09</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
            <Issr>HSBC</Issr>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>HSBC-REV-20260209-003</AcctSvcrRef>
              <EndToEndId>REVERSAL-VENDOR-PAYMENT-001</EndToEndId>
            </Refs>
            <RltdPties>
              <Cdtr>
                <Nm>Software Vendor Ltd</Nm>
              </Cdtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Reversal of payment due to incorrect invoice amount</Ustrd>
            </RmtInf>
            <AddtlNtryInf>Automatic reversal - original payment will be reissued with correct amount</AddtlNtryInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`,
  },
  {
    id: 'camt052-intraday',
    label: 'camt.052 - Interim Report',
    description: 'ISO 20022 intraday bank-to-customer account report (camt.052.001.10)',
    format: MessageFormat.MX,
    messageType: MessageType.CAMT052,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.052.001.10">
  <BkToCstmrAcctRpt>
    <GrpHdr>
      <MsgId>INTRADAY-RPT-20260210-1430</MsgId>
      <CreDtTm>2026-02-10T14:30:00Z</CreDtTm>
    </GrpHdr>
    <Rpt>
      <Id>RPT-20260210-003</Id>
      <LglSeqNb>3</LglSeqNb>
      <CreDtTm>2026-02-10T14:30:00Z</CreDtTm>
      <FrToDt>
        <FrDtTm>2026-02-10T00:00:00Z</FrDtTm>
        <ToDtTm>2026-02-10T14:30:00Z</ToDtTm>
      </FrToDt>
      <Acct>
        <Id>
          <IBAN>FR1420041010050500013M02606</IBAN>
        </Id>
        <Ccy>EUR</Ccy>
        <Nm>Corporate Treasury Account</Nm>
        <Ownr>
          <Nm>Global Enterprises SA</Nm>
        </Ownr>
        <Svcr>
          <FinInstnId>
            <BICFI>BNPAFRPP</BICFI>
            <Nm>BNP Paribas</Nm>
          </FinInstnId>
        </Svcr>
      </Acct>
      <RptgSrc>
        <Prtry>FLOOR_LIMIT_EUR_5000</Prtry>
      </RptgSrc>
      <TxsSummary>
        <TtlNtries>
          <NbOfNtries>28</NbOfNtries>
          <Sum>185500.00</Sum>
        </TtlNtries>
        <TtlCdtNtries>
          <NbOfNtries>18</NbOfNtries>
          <Sum>245000.00</Sum>
        </TtlCdtNtries>
        <TtlDbtNtries>
          <NbOfNtries>10</NbOfNtries>
          <Sum>59500.00</Sum>
        </TtlDbtNtries>
      </TxsSummary>
      <Ntry>
        <NtryRef>NTRY-20260210-HV-001</NtryRef>
        <Amt Ccy="EUR">50000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>
          <Cd>BOOK</Cd>
        </Sts>
        <BookgDt>
          <DtTm>2026-02-10T09:15:23Z</DtTm>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-10</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>TRF-HV-001</AcctSvcrRef>
              <EndToEndId>E2E-TRADE-SETTLEMENT-001</EndToEndId>
              <UETR>a1b2c3d4-e5f6-4789-a012-3456789abcde</UETR>
            </Refs>
            <RltdPties>
              <Dbtr>
                <Nm>International Trading Corp</Nm>
              </Dbtr>
              <DbtrAcct>
                <Id>
                  <IBAN>DE89370400440532013000</IBAN>
                </Id>
              </DbtrAcct>
            </RltdPties>
            <RmtInf>
              <Ustrd>Trade settlement - Contract REF-2026-Q1-001</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <NtryRef>NTRY-20260210-HV-002</NtryRef>
        <Amt Ccy="EUR">25000.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts>
          <Cd>BOOK</Cd>
        </Sts>
        <BookgDt>
          <DtTm>2026-02-10T10:45:12Z</DtTm>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-10</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>TRF-PAY-002</AcctSvcrRef>
              <EndToEndId>E2E-SUPPLIER-PAYMENT-002</EndToEndId>
            </Refs>
            <RltdPties>
              <Cdtr>
                <Nm>Manufacturing Supplies Ltd</Nm>
              </Cdtr>
              <CdtrAcct>
                <Id>
                  <IBAN>GB82WEST12345698765432</IBAN>
                </Id>
              </CdtrAcct>
            </RltdPties>
            <RmtInf>
              <Ustrd>Bulk purchase payment - Invoice BULK-2026-02</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <NtryRef>NTRY-20260210-HV-003</NtryRef>
        <Amt Ccy="EUR">75000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>
          <Cd>BOOK</Cd>
        </Sts>
        <BookgDt>
          <DtTm>2026-02-10T12:20:45Z</DtTm>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-10</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>TRF-RECV-003</AcctSvcrRef>
              <EndToEndId>E2E-CLIENT-PAYMENT-PROJ-X</EndToEndId>
            </Refs>
            <RltdPties>
              <Dbtr>
                <Nm>Enterprise Client Solutions GmbH</Nm>
              </Dbtr>
              <DbtrAcct>
                <Id>
                  <IBAN>DE75512108001245126199</IBAN>
                </Id>
              </DbtrAcct>
            </RltdPties>
            <RmtInf>
              <Ustrd>Project milestone payment - Phase 2 completion</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <NtryRef>NTRY-20260210-HV-004</NtryRef>
        <Amt Ccy="EUR">15000.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts>
          <Cd>PDNG</Cd>
        </Sts>
        <BookgDt>
          <DtTm>2026-02-10T13:55:30Z</DtTm>
        </BookgDt>
        <ValDt>
          <Dt>2026-02-10</Dt>
        </ValDt>
        <BkTxCd>
          <Prtry>
            <Cd>NTRF</Cd>
          </Prtry>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <AcctSvcrRef>TRF-PEND-004</AcctSvcrRef>
              <EndToEndId>E2E-TAX-PAYMENT-Q1</EndToEndId>
            </Refs>
            <RltdPties>
              <Cdtr>
                <Nm>Tax Authority - Corporate Division</Nm>
              </Cdtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Q1 2026 corporate tax payment - pending clearance</Ustrd>
            </RmtInf>
            <AddtlNtryInf>Held for compliance verification - expected clearance by 16:00</AddtlNtryInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Rpt>
  </BkToCstmrAcctRpt>
</Document>`,
  },
];

// Alias for convenience
export const samples = sampleMessages;
