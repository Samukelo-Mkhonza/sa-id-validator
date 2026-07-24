import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Lightweight, dependency-free i18n. Covers the prominent UI strings in three of
// South Africa's official languages. Translations are a reviewed-worthy starting
// point — a native/professional review is recommended before production use.
// Any missing key falls back to English, then to the key itself.
const STRINGS = {
    en: {
        appTitle: 'South African ID Validator',
        tabSingle: 'Single ID',
        tabBulk: 'Bulk / batch',
        tabReconcile: 'Reconcile',
        langLabel: 'Language',
        idLabel: 'ID Number',
        validate: 'Validate',
        validating: 'Validating…',
        clear: 'Clear',
        consent: 'I confirm I have the person’s consent, or a lawful basis, to process this ID number (POPIA).',
        resultValid: 'Well-formed South African ID number',
        dob: 'Date of Birth',
        gender: 'Gender',
        citizenship: 'Citizenship',
        age: 'Age',
        grantsTitle: 'Age-based grant indicators',
        singleSubtitle: 'Enter a 13-digit ID number to verify its checksum and view the encoded details.',
        bulkTitle: 'Bulk ID Validation',
        bulkSubtitle: 'Check a whole list at once and flag malformed IDs and duplicates.',
        demographicsTitle: 'Aggregate demographics',
        insertSamples: 'Insert sample IDs',
        downloadCsv: 'Download results (CSV)',
        showFullIds: 'Show full IDs',
        reconcileTitle: 'Cross-list Reconciliation',
        reconcileSubtitle: 'Find ID numbers that appear in BOTH lists — e.g. an employee who is also a paid supplier.',
        listA: 'List A (e.g. payroll)',
        listB: 'List B (e.g. suppliers)',
        findOverlaps: 'Find overlaps',
        scanTitle: 'From a scan, barcode or MRZ',
        scanExtract: 'Extract ID',
        verifyTitle: 'Simulated identity check',
        verifyRun: 'Run simulated check (mock)',
        footer: 'This tool checks the structure and Luhn checksum of a South African ID number and decodes the details it encodes. It does not verify identity against any government database — a well-formed number is not proof that the ID exists or belongs to anyone.',
    },
    zu: {
        appTitle: 'Isihloli se-ID yaseNingizimu Afrika',
        tabSingle: 'I-ID eyodwa',
        tabBulk: 'Ngobuningi',
        tabReconcile: 'Qhathanisa',
        langLabel: 'Ulimi',
        idLabel: 'Inombolo ye-ID',
        validate: 'Qinisekisa',
        validating: 'Iyaqinisekisa…',
        clear: 'Sula',
        consent: 'Ngiyaqinisekisa ukuthi nginemvume yomuntu, noma isizathu esisemthethweni, sokucubungula le nombolo ye-ID (POPIA).',
        resultValid: 'Inombolo ye-ID yaseNingizimu Afrika eyakhiwe kahle',
        dob: 'Usuku lokuzalwa',
        gender: 'Ubulili',
        citizenship: 'Ubuzwe',
        age: 'Iminyaka',
        grantsTitle: 'Izinkomba zesibonelelo ezisekelwe eminyakeni',
        singleSubtitle: 'Faka inombolo ye-ID enezinombolo eziyi-13 ukuze uqinisekise i-checksum futhi ubone imininingwane efakiwe.',
        bulkTitle: 'Ukuqinisekiswa kwe-ID ngobuningi',
        bulkSubtitle: 'Hlola uhlu lonke ngesikhathi esisodwa futhi umaka ama-ID akhiwe kabi nafanayo.',
        demographicsTitle: 'Izibalo zabantu ezihlanganisiwe',
        insertSamples: 'Faka ama-ID esampula',
        downloadCsv: 'Landa imiphumela (CSV)',
        showFullIds: 'Bonisa ama-ID aphelele',
        reconcileTitle: 'Ukuqhathanisa izinhlu',
        reconcileSubtitle: 'Thola izinombolo ze-ID ezivela kuzo zombili izinhlu — isb. umsebenzi ophinde abe umhlinzeki okhokhelwayo.',
        listA: 'Uhlu A (isb. iholo)',
        listB: 'Uhlu B (isb. abahlinzeki)',
        findOverlaps: 'Thola ukugqagqana',
        scanTitle: 'Kusukela ekuskeneni, kubhakhodi noma ku-MRZ',
        scanExtract: 'Khipha i-ID',
        verifyTitle: 'Ukuhlolwa kobunikazi okulingisiwe',
        verifyRun: 'Qalisa ukuhlola okulingisiwe',
        footer: 'Leli thuluzi lihlola isakhiwo ne-Luhn checksum yenombolo ye-ID yaseNingizimu Afrika futhi lihumushe imininingwane efakiwe. Aliqinisekisi ubunikazi kunoma yiluphi isizindalwazi sikahulumeni — inombolo eyakhiwe kahle ayikhona ubufakazi bokuthi i-ID ikhona noma ingeyomuntu othile.',
    },
    af: {
        appTitle: 'Suid-Afrikaanse ID-valideerder',
        tabSingle: 'Enkele ID',
        tabBulk: 'Grootmaat',
        tabReconcile: 'Rekonsilieer',
        langLabel: 'Taal',
        idLabel: 'ID-nommer',
        validate: 'Valideer',
        validating: 'Besig om te valideer…',
        clear: 'Vee uit',
        consent: 'Ek bevestig dat ek die persoon se toestemming, of ’n wettige grondslag, het om hierdie ID-nommer te verwerk (POPIA).',
        resultValid: 'Geldig gevormde Suid-Afrikaanse ID-nommer',
        dob: 'Geboortedatum',
        gender: 'Geslag',
        citizenship: 'Burgerskap',
        age: 'Ouderdom',
        grantsTitle: 'Ouderdomsgebaseerde toelae-aanwysers',
        singleSubtitle: 'Voer ’n 13-syfer ID-nommer in om die kontrolesom te verifieer en die gekodeerde besonderhede te sien.',
        bulkTitle: 'Grootmaat ID-validering',
        bulkSubtitle: 'Kontroleer ’n hele lys gelyktydig en merk wanvormde ID’s en duplikate.',
        demographicsTitle: 'Saamgestelde demografie',
        insertSamples: 'Voeg voorbeeld-ID’s in',
        downloadCsv: 'Laai resultate af (CSV)',
        showFullIds: 'Wys volledige ID’s',
        reconcileTitle: 'Kruislys-rekonsiliasie',
        reconcileSubtitle: 'Vind ID-nommers wat in ALBEI lyste voorkom — bv. ’n werknemer wat ook ’n betaalde verskaffer is.',
        listA: 'Lys A (bv. betaalstaat)',
        listB: 'Lys B (bv. verskaffers)',
        findOverlaps: 'Vind oorvleuelings',
        scanTitle: 'Vanaf ’n skandering, strepieskode of MRZ',
        scanExtract: 'Onttrek ID',
        verifyTitle: 'Gesimuleerde identiteitskontrole',
        verifyRun: 'Voer gesimuleerde kontrole uit',
        footer: 'Hierdie hulpmiddel kontroleer die struktuur en Luhn-kontrolesom van ’n Suid-Afrikaanse ID-nommer en dekodeer die besonderhede wat dit bevat. Dit verifieer nie identiteit teen enige regeringsdatabasis nie — ’n geldig gevormde nommer is nie bewys dat die ID bestaan of aan iemand behoort nie.',
    },
};

export const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'zu', label: 'isiZulu' },
    { code: 'af', label: 'Afrikaans' },
];

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
    const [lang, setLang] = useState('en');

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const value = useMemo(() => {
        const t = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
        return { lang, setLang, t };
    }, [lang]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
