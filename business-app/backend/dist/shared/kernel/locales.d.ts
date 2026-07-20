export declare const LOCALES: {
    readonly EN_AU: "en-AU";
    readonly EN_US: "en-US";
    readonly EN_GB: "en-GB";
    readonly EN_CA: "en-CA";
    readonly EN_NZ: "en-NZ";
    readonly ES_AR: "es-AR";
    readonly ES_ES: "es-ES";
    readonly ES_MX: "es-MX";
    readonly FR_FR: "fr-FR";
    readonly DE_DE: "de-DE";
    readonly PT_BR: "pt-BR";
    readonly ZH_CN: "zh-CN";
    readonly JA_JP: "ja-JP";
    readonly IT_IT: "it-IT";
    readonly NL_NL: "nl-NL";
};
export type LocaleCode = (typeof LOCALES)[keyof typeof LOCALES];
