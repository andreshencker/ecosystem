import { MdmService } from './mdm.service';
export declare class MdmController {
    private readonly mdm;
    constructor(mdm: MdmService);
    getCurrencies(): {
        items: import("./mdm.service").CurrencyEntry[];
    };
    getTaxRates(jurisdiction?: string): {
        items: import("./mdm.service").TaxRateEntry[];
    };
    getInvoiceStatuses(): {
        items: import("./mdm.service").InvoiceStatusEntry[];
    };
    getPaymentMethods(): {
        items: import("./mdm.service").PaymentMethodEntry[];
    };
    getBillingCycles(): {
        items: import("./mdm.service").BillingCycleEntry[];
    };
}
