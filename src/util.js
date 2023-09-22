
export function parseLocaleNumber(numberString = '', locale = document.documentElement.lang) {
    const formatter = Intl.NumberFormat(locale);
    const parts = formatter.formatToParts(1000.1);
    const groupSeparator = parts.find(part => part.type === 'group').value;
    const decimalSeparator = parts.find(part => part.type === 'decimal').value;

    return parseFloat(numberString
        .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
        .replace(new RegExp(`\\${decimalSeparator}`), '.')
    );
}
