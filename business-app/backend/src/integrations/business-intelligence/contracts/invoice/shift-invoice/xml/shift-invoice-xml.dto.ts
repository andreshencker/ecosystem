// XML contract DTO for the Shift Invoice.
//
// Preserves the business hierarchy in an XML-friendly structure.
// Key differences from JSON:
//   · Worked-hours rows are wrapped in a container element ("workedHours")
//     with typed item elements ("row") to reflect XML list conventions.
//   · Payment information and notes are kept as objects for element nesting.
//   · Attribute-friendly: all IDs and reference strings use camelCase.

// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface ShiftInvoiceXmlCompanyDto {
  businessId:  string;
  companyName: string;
  abn:         string | null;
  address:     string | null;
  email:       string | null;
  phone:       string | null;
}

export interface ShiftInvoiceXmlCustomerDto {
  customerId:   string;
  customerName: string;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
}

export interface ShiftInvoiceXmlInvoiceDto {
  invoiceId:     string;
  invoiceNumber: string;
  invoiceDate:   string;
  dueDate:       string | null;
  currency:      string;
  status:        string;
  contractId:    string | null;
  contractTitle: string | null;
}

export interface ShiftInvoiceXmlWorkedHoursRowDto {
  shiftId:     string;
  workDate:    string;
  description: string | null;
  startTime:   string | null;
  endTime:     string | null;
  workedHours: string;
  hourlyRate:  string;
  amount:      string;
}

export interface ShiftInvoiceXmlTotalsDto {
  subtotal:  string;
  taxRate:   string | null;
  taxAmount: string;
  total:     string;
  chargeGst: boolean;
  currency:  string;
}

export interface ShiftInvoiceXmlPaymentInformationDto {
  bankName:          string | null;
  accountName:       string | null;
  bsb:               string | null;
  accountNumber:     string | null;
  paymentReference:  string | null;
  paymentTermsDays:  number | null;
  paymentDueDate:    string | null;
}

export interface ShiftInvoiceXmlNotesDto {
  invoiceNotes: string | null;
  paymentNotes: string | null;
  terms:        string | null;
}

export interface ShiftInvoiceXmlMetadataDto {
  generatedAt:      string;
  contractVersion:  string | null;
  source:           string;
}

// ─── Root DTO ─────────────────────────────────────────────────────────────────

/**
 * XML-friendly hierarchy for a Shift Invoice.
 * An XML serialiser maps each key to an element; arrays map to repeated elements.
 */
export interface ShiftInvoiceXmlDto {
  company:            ShiftInvoiceXmlCompanyDto;
  customer:           ShiftInvoiceXmlCustomerDto;
  invoice:            ShiftInvoiceXmlInvoiceDto;
  /** Container for worked-hours rows — serialised as <workedHours><row>...</row></workedHours>. */
  workedHours:        ShiftInvoiceXmlWorkedHoursRowDto[];
  totals:             ShiftInvoiceXmlTotalsDto;
  paymentInformation: ShiftInvoiceXmlPaymentInformationDto;
  notes:              ShiftInvoiceXmlNotesDto;
  metadata:           ShiftInvoiceXmlMetadataDto;
}
